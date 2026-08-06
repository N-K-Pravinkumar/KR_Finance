import React, { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { MessageCircle, MessageSquare, Pencil, ArrowLeft, Trash2, CheckSquare, Square, XCircle as XCircleIcon, X as XIcon, ShieldCheck } from 'lucide-react'
import { api } from '../api/client'
import { Customer, Payment, PaymentType, AuditEntry, TimelineEntry } from '../types'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Dialog, ConfirmDialog } from '../components/ui/Dialog'
import { formatCurrency, formatDate, dueLabel, isOverdue, buildWhatsAppMessage, buildWhatsAppLink } from '../utils/format'
import { useAuth } from '../context/AuthContext'

export default function CustomerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isAdmin } = useAuth()

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [timeline, setTimeline] = useState<TimelineEntry[]>([])
  const [history, setHistory] = useState<AuditEntry[]>([])
  const [otherLoans, setOtherLoans] = useState<Customer[]>([])
  const [editPayment, setEditPayment] = useState<Payment | null>(null)
  const [editForm, setEditForm] = useState({ amount: 0, date: '', notes: '', reason: '', type: 'Paid' as PaymentType })
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [closeConfirm, setCloseConfirm] = useState(false)
  const [addSlot, setAddSlot] = useState<TimelineEntry | null>(null)
  const [addForm, setAddForm] = useState({ amount: 0, type: 'Paid' as PaymentType, notes: '' })
  const [addSubmitting, setAddSubmitting] = useState(false)

  // Bulk selection on the full schedule: pick several days, then mark them all Paid / Not Paid,
  // or clear whatever marking they already had, in one action.
  const [selectMode, setSelectMode] = useState(false)
  const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  // Inline editing of the Finance Summary card, right on the detail page.
  const [financeEditMode, setFinanceEditMode] = useState(false)
  const [financeForm, setFinanceForm] = useState({
    financeAmount: 0, interest: 0, installmentAmount: 0, totalInstallments: 100,
    financeType: 'Daily' as Customer['financeType'], collectionDay: '', startDate: '',
    totalPaid: 0, paidInstallments: 0
  })
  const [financeSaving, setFinanceSaving] = useState(false)

  const load = () => {
    api.get<Customer>(`/customers/${id}`).then((r) => setCustomer(r.data))
    api.get<Payment[]>(`/payments/customer/${id}`).then((r) => setPayments(r.data))
    api.get<TimelineEntry[]>(`/payments/customer/${id}/timeline`).then((r) => setTimeline(r.data)).catch(() => setTimeline([]))
    api.get<AuditEntry[]>(`/audit-logs/customer/${id}`).then((r) => setHistory(r.data)).catch(() => setHistory([]))
    api.get<Customer[]>(`/customers/${id}/other-loans`).then((r) => setOtherLoans(r.data)).catch(() => setOtherLoans([]))
  }

  useEffect(() => { load() }, [id])

  useEffect(() => {
    if (!successMsg) return
    const t = setTimeout(() => setSuccessMsg(''), 3000)
    return () => clearTimeout(t)
  }, [successMsg])

  if (!customer) return <p className="text-sm text-gray-400 dark:text-gray-500 py-10 text-center">Loading...</p>

  const installment = customer.installmentAmount || 0
  // For Advance payments, the amount field always represents "extra on top of today's
  // installment" rather than the raw total — toTotal/toExtra convert between the two so the
  // number stored in the DB (the real total charged that day) always includes today's amount.
  const toTotal = (extra: number) => installment + (extra || 0)
  const toExtra = (total: number) => Math.max(0, (total || 0) - installment)

  const openEdit = (p: Payment) => {
    setEditPayment(p)
    setEditForm({
      amount: p.type === 'Advance' ? toExtra(p.amount) : p.amount,
      date: p.date.slice(0, 10),
      notes: p.notes || '',
      reason: '',
      type: p.type
    })
  }

  const handleEditTypeChange = (type: PaymentType) => {
    setEditForm((f) => {
      if (type === 'NotPaid') return { ...f, type, amount: 0 }
      if (type === 'Paid' && !f.amount) return { ...f, type, amount: installment }
      if (type === 'Advance' && f.type !== 'Advance') return { ...f, type, amount: 0 }
      return { ...f, type }
    })
  }

  const submitEdit = async () => {
    if (!editPayment) return
    const amount = editForm.type === 'NotPaid' ? 0 : editForm.type === 'Advance' ? toTotal(editForm.amount) : editForm.amount
    await api.put(`/payments/${editPayment.id}`, {
      amount,
      date: editForm.date,
      notes: editForm.notes,
      type: editForm.type,
      editedBy: user?.name,
      reason: editForm.reason
    }, { params: { editedBy: user?.name, reason: editForm.reason } })
    setEditPayment(null)
    load()
  }

  const handleDelete = async () => {
    await api.delete(`/customers/${customer.id}`)
    navigate('/customers')
  }

  const submitClose = async () => {
    try {
      await api.put(`/customers/${customer.id}/close`, {}, { params: { editedBy: user?.name, reason: 'Fully collected — account closed' } })
      setSuccessMsg('Account closed.')
      load()
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.response?.data || 'Could not close account.')
    } finally {
      setCloseConfirm(false)
    }
  }

  const openFinanceEdit = () => {
    setFinanceForm({
      financeAmount: customer.financeAmount || 0,
      interest: customer.interest || 0,
      installmentAmount: customer.installmentAmount || 0,
      totalInstallments: customer.totalInstallments || 100,
      financeType: customer.financeType,
      collectionDay: customer.collectionDay || '',
      startDate: customer.startDate.slice(0, 10),
      totalPaid: customer.totalPaid || 0,
      paidInstallments: customer.paidInstallments || 0
    })
    setFinanceEditMode(true)
  }

  const submitFinanceEdit = async () => {
    setFinanceSaving(true)
    try {
      // The backend's update endpoint expects the full customer object (it isn't a partial
      // PATCH), so everything not being edited here is passed through unchanged from the
      // currently-loaded customer to avoid accidentally wiping name/mobile/address/etc.
      const payload = {
        ...customer,
        financeAmount: financeForm.financeAmount,
        interest: financeForm.interest,
        installmentAmount: financeForm.installmentAmount,
        totalInstallments: financeForm.totalInstallments,
        financeType: financeForm.financeType,
        collectionDay: financeForm.financeType === 'Weekly' ? financeForm.collectionDay : null,
        startDate: financeForm.startDate,
        totalPaid: financeForm.totalPaid,
        paidInstallments: financeForm.paidInstallments
      }
      await api.put(`/customers/${customer.id}`, payload, { params: { editedBy: user?.name, reason: 'Finance summary edited from detail page' } })
      setFinanceEditMode(false)
      setSuccessMsg('Finance summary updated.')
      load()
    } finally {
      setFinanceSaving(false)
    }
  }

  // Clicking a slot on the full schedule: in select mode, toggles that day's checkbox.
  // Otherwise, if it already has a recorded payment, opens the (admin-only) edit dialog;
  // if not, opens a quick "add payment for this day" dialog.
  const openTimelineSlot = (t: TimelineEntry) => {
    if (selectMode) {
      setSelectedDays((prev) => {
        const next = new Set(prev)
        if (next.has(t.installmentNo)) next.delete(t.installmentNo)
        else next.add(t.installmentNo)
        return next
      })
      return
    }
    if (t.paymentId) {
      const existing = payments.find((p) => p.id === t.paymentId)
      if (existing && isAdmin) openEdit(existing)
      return
    }
    setAddSlot(t)
    setAddForm({ amount: installment, type: 'Paid', notes: '' })
  }

  const handleAddTypeChange = (type: PaymentType) => {
    setAddForm((f) => {
      if (type === 'NotPaid') return { ...f, type, amount: 0 }
      if (type === 'Paid' && !f.amount) return { ...f, type, amount: installment }
      if (type === 'Advance' && f.type !== 'Advance') return { ...f, type, amount: 0 }
      return { ...f, type }
    })
  }

  const submitAddSlot = async () => {
    if (!addSlot) return
    setAddSubmitting(true)
    try {
      const amount = addForm.type === 'NotPaid' ? 0 : addForm.type === 'Advance' ? toTotal(addForm.amount) : addForm.amount
      await api.post('/payments', {
        customerId: customer.id,
        date: addSlot.date,
        amount,
        type: addForm.type,
        collectedBy: user?.name || 'Staff',
        notes: addForm.notes || `Added from timeline (Day ${addSlot.installmentNo})`
      })
      setAddSlot(null)
      load()
    } finally {
      setAddSubmitting(false)
    }
  }

  const toggleSelectMode = () => {
    setSelectMode((v) => !v)
    setSelectedDays(new Set())
  }

  const selectedEntries = timeline.filter((t) => selectedDays.has(t.installmentNo))

  const bulkMark = async (type: 'Paid' | 'NotPaid') => {
    if (selectedEntries.length === 0) return
    setBulkBusy(true)
    try {
      await Promise.all(selectedEntries.map((t) => {
        const amount = type === 'Paid' ? installment : 0
        if (t.paymentId) {
          return api.put(`/payments/${t.paymentId}`, {
            amount, type, editedBy: user?.name, reason: 'Bulk update from full schedule'
          }, { params: { editedBy: user?.name, reason: 'Bulk update from full schedule' } })
        }
        return api.post('/payments', {
          customerId: customer.id,
          date: t.date,
          amount,
          type,
          collectedBy: user?.name || 'Staff',
          notes: `Bulk marked ${type} from full schedule (Day ${t.installmentNo})`
        })
      }))
      setSuccessMsg(`${selectedEntries.length} day(s) marked ${type === 'Paid' ? 'Paid' : 'Not Paid'}.`)
      setSelectedDays(new Set())
      load()
    } finally {
      setBulkBusy(false)
    }
  }

  const bulkRemoveMarking = async () => {
    const toRemove = selectedEntries.filter((t) => t.paymentId)
    if (toRemove.length === 0) return
    setBulkBusy(true)
    try {
      await Promise.all(toRemove.map((t) =>
        api.delete(`/payments/${t.paymentId}`, { params: { deletedBy: user?.name, reason: 'Bulk removed from full schedule' } })
      ))
      setSuccessMsg(`Cleared marking on ${toRemove.length} day(s).`)
      setSelectedDays(new Set())
      load()
    } finally {
      setBulkBusy(false)
    }
  }

  const waMessage = buildWhatsAppMessage({
    name: customer.name,
    pendingAmount: customer.pendingAmount,
    lastPaymentDate: customer.lastPaymentDate,
    lastPaymentAmount: customer.lastPaymentAmount,
    nextDueDate: customer.nextDueDate,
    financeType: customer.financeType
  })
  const waLink = buildWhatsAppLink(customer.mobile, waMessage)
  const smsLink = `sms:${customer.mobile}?body=${encodeURIComponent(waMessage)}`

  return (
    <div className="space-y-4 py-2">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{customer.name}</h1>
            <Badge color={customer.status === 'Running' ? 'blue' : customer.status === 'Completed' ? 'green' : 'gray'}>{customer.status}</Badge>
            {isOverdue(customer.nextDueDate, customer.status) && <Badge color="red">Overdue</Badge>}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{customer.mobile} &middot; {customer.address}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <a href={waLink} target="_blank" rel="noreferrer">
            <Button variant="success" size="sm"><MessageCircle size={14} /> <span className="hidden sm:inline">WhatsApp Reminder</span><span className="sm:hidden">WhatsApp</span></Button>
          </a>
          <a href={smsLink}>
            <Button variant="secondary" size="sm"><MessageSquare size={14} /> SMS</Button>
          </a>
          {isAdmin && (
            <Link to={`/customers/${customer.id}/edit`}>
              <Button variant="secondary" size="sm"><Pencil size={14} /> Edit</Button>
            </Link>
          )}
          {isAdmin && customer.status === 'Completed' && (
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setCloseConfirm(true)}>
              <ShieldCheck size={14} /> <span className="hidden sm:inline">Close This Account</span><span className="sm:hidden">Close</span>
            </Button>
          )}
          {isAdmin && (
            <Button variant="danger" size="sm" onClick={() => setDeleteConfirm(true)}><Trash2 size={14} /> Delete</Button>
          )}
        </div>
      </div>

      {successMsg && (
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 text-sm rounded-lg px-4 py-2">
          {successMsg}
        </div>
      )}

      {customer.status === 'Completed' && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-sm rounded-lg px-4 py-2">
          This loan is fully collected. {isAdmin ? 'Use "Close This Account" above to close it out — closed accounts are removed from active/Running totals.' : 'An admin can close this account from here.'}
        </div>
      )}

      {otherLoans.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 text-sm">
            Other Loans for {customer.name} ({otherLoans.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {otherLoans.map((o) => (
              <Link
                key={o.id}
                to={`/customers/${o.id}`}
                className="flex items-center gap-2 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(o.financeAmount)}</span>
                <Badge color={o.status === 'Running' ? 'blue' : o.status === 'Completed' ? 'green' : 'gray'}>{o.status}</Badge>
                <span className="text-gray-400 dark:text-gray-500">Pending {formatCurrency(o.pendingAmount)}</span>
              </Link>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Total Pending" value={formatCurrency(customer.pendingAmount)} />
        <Stat label="Current Balance" value={formatCurrency(customer.currentBalance)} />
        <Stat label={customer.financeType === 'Weekly' ? 'Weeks Left' : 'Days Left'} value={dueLabel(customer.nextDueDate, customer.financeType)} />
        <Stat label="Last Payment" value={customer.lastPaymentDate ? `${formatCurrency(customer.lastPaymentAmount)} on ${formatDate(customer.lastPaymentDate)}` : 'No payments yet'} />
        <Stat label="Next Due Date" value={formatDate(customer.nextDueDate)} />
        <Stat label="Start Date" value={formatDate(customer.startDate)} />
        <Stat label="End Date (Est.)" value={customer.endDate ? formatDate(customer.endDate) : '—'} />
        <Stat label="Installments Paid" value={`${customer.paidInstallments} / ${customer.totalInstallments}`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1 p-4 space-y-2 text-sm">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Finance Summary</h3>
            {isAdmin && !financeEditMode && (
              <button onClick={openFinanceEdit} className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 p-1" title="Edit finance summary">
                <Pencil size={14} />
              </button>
            )}
          </div>

          {financeEditMode ? (
            <div className="space-y-3">
              <FinanceField label="Finance Amount (Rs.)" type="number" value={financeForm.financeAmount}
                onChange={(v) => setFinanceForm((f) => ({ ...f, financeAmount: Number(v) }))} />
              <FinanceField label="Interest (%)" type="number" value={financeForm.interest}
                onChange={(v) => setFinanceForm((f) => ({ ...f, interest: Number(v) }))} />
              <FinanceField label="Daily/Weekly Installment (Rs.)" type="number" value={financeForm.installmentAmount}
                onChange={(v) => setFinanceForm((f) => ({ ...f, installmentAmount: Number(v) }))} />
              <FinanceField label="Total Installments" type="number" value={financeForm.totalInstallments}
                onChange={(v) => setFinanceForm((f) => ({ ...f, totalInstallments: Number(v) }))} />
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Type</label>
                <select className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm"
                  value={financeForm.financeType} onChange={(e) => setFinanceForm((f) => ({ ...f, financeType: e.target.value as Customer['financeType'] }))}>
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                </select>
              </div>
              {financeForm.financeType === 'Weekly' && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Collection Day</label>
                  <select className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm"
                    value={financeForm.collectionDay} onChange={(e) => setFinanceForm((f) => ({ ...f, collectionDay: e.target.value }))}>
                    <option value="">Select day</option>
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              )}
              <FinanceField label="Start Date" type="date" value={financeForm.startDate}
                onChange={(v) => setFinanceForm((f) => ({ ...f, startDate: v }))} />
              <FinanceField label="Total Paid (Rs.)" type="number" value={financeForm.totalPaid}
                onChange={(v) => setFinanceForm((f) => ({ ...f, totalPaid: Number(v) }))} />
              <FinanceField label="Installments Paid" type="number" value={financeForm.paidInstallments}
                onChange={(v) => setFinanceForm((f) => ({ ...f, paidInstallments: Number(v) }))} />
              <p className="text-xs text-amber-600 dark:text-amber-400 -mt-2">
                Total Amount, Current Balance and Total Pending are calculated automatically from these values.
              </p>
              <div className="flex gap-2 pt-1">
                <Button size="sm" className="flex-1" disabled={financeSaving} onClick={submitFinanceEdit}>
                  {financeSaving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button size="sm" variant="secondary" className="flex-1" onClick={() => setFinanceEditMode(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <Row label="Finance Amount" value={formatCurrency(customer.financeAmount)} />
              <Row label="Interest" value={`${customer.interest}%`} />
              <Row label="Total Amount" value={formatCurrency(customer.totalAmount)} />
              <Row label="Total Paid" value={formatCurrency(customer.totalPaid)} />
              <Row label="Current Balance" value={formatCurrency(customer.currentBalance)} />
              <Row label="Installment" value={formatCurrency(customer.installmentAmount)} />
              <Row label="Type" value={customer.financeType} />
              {customer.financeType === 'Weekly' && <Row label="Collection Day" value={customer.collectionDay || '-'} />}
              <Row label="Installments Paid" value={`${customer.paidInstallments} / ${customer.totalInstallments}`} />
              <Row label="Start Date" value={formatDate(customer.startDate)} />
              <Row label="End Date (Est.)" value={customer.endDate ? formatDate(customer.endDate) : '—'} />
              <Row label="Total Pending" value={formatCurrency(customer.pendingAmount)} />
              <p className="text-xs text-gray-400 dark:text-gray-500 pt-2">
                Use the Full Schedule below to record or edit any day&apos;s payment.
              </p>
            </>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Payment Timeline</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
            {payments.length === 0 && <p className="text-sm text-gray-400 dark:text-gray-500">No payments recorded yet.</p>}
            {[...payments]
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((p) => (
              <div key={p.id} className="flex items-start justify-between border border-gray-100 dark:border-gray-700 rounded-lg p-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{formatCurrency(p.amount)}</span>
                    <Badge color={p.type === 'Paid' ? 'green' : p.type === 'Partial' ? 'yellow' : p.type === 'Advance' ? 'purple' : 'red'}>{p.type}</Badge>
                    {p.isEdited && <Badge color="gray">Edited</Badge>}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{formatDate(p.date)} &middot; by {p.collectedBy}</p>
                  {p.notes && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{p.notes}</p>}
                  {p.isEdited && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                      Edited by {p.editedBy} on {formatDate(p.editedAt)} — {p.editReason}
                    </p>
                  )}
                </div>
                {isAdmin && (
                  <button onClick={() => openEdit(p)} className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 p-1">
                    <Pencil size={14} />
                  </button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
            <CardTitle>Full {customer.totalInstallments}-{customer.financeType === 'Weekly' ? 'Week' : 'Day'} Schedule</CardTitle>
            {isAdmin && (
              <Button size="sm" variant={selectMode ? 'secondary' : 'secondary'} onClick={toggleSelectMode}>
                {selectMode ? <><XIcon size={14} /> Cancel Selection</> : <><CheckSquare size={14} /> Select Days</>}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {timeline.length === 0 && <p className="text-sm text-gray-400 dark:text-gray-500">No schedule available.</p>}
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
              {selectMode
                ? 'Tap days to select them, then choose a bulk action below.'
                : `Click any day to ${isAdmin ? 'add or edit' : 'add'} its payment.`}
            </p>

            {selectMode && selectedDays.size > 0 && (
              <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedDays(new Set())} />
                <div className="relative bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl shadow-xl p-5">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">Bulk update days</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{selectedDays.size} day{selectedDays.size === 1 ? '' : 's'} selected</p>
                  <div className="flex flex-col gap-2">
                    <Button variant="success" disabled={bulkBusy} onClick={() => bulkMark('Paid')}>
                      Mark Paid
                    </Button>
                    <Button variant="danger" disabled={bulkBusy} onClick={() => bulkMark('NotPaid')}>
                      Mark Not Paid
                    </Button>
                    <Button variant="secondary" disabled={bulkBusy || selectedEntries.every((t) => !t.paymentId)} onClick={bulkRemoveMarking}>
                      <XCircleIcon size={14} /> Mark as Not Marked
                    </Button>
                    <Button variant="ghost" disabled={bulkBusy} onClick={() => setSelectedDays(new Set())}>
                      Cancel
                    </Button>
                  </div>
                  {bulkBusy && <p className="text-xs text-gray-400 mt-3 text-center">Saving...</p>}
                </div>
              </div>
            )}
            {selectMode && selectedDays.size === 0 && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">Select one or more days to open bulk actions.</p>
            )}

            <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2 max-h-[420px] overflow-y-auto pr-1 pb-1">
              {timeline.map((t) => {
                const clickable = selectMode || !t.paymentId || isAdmin
                const isSelected = selectedDays.has(t.installmentNo)
                return (
                  <button
                    type="button"
                    key={t.installmentNo}
                    onClick={() => openTimelineSlot(t)}
                    disabled={!clickable}
                    title={`Day ${t.installmentNo} · ${formatDate(t.date)} · ${statusLabel(t.status)}${t.amount ? ' · ' + formatCurrency(t.amount) : ''}${clickable && !selectMode ? ' · click to ' + (t.paymentId ? 'edit' : 'add') : ''}`}
                    className={
                      'relative rounded-lg px-1.5 py-2 text-center border transition ' +
                      timelineColor(t.status) +
                      (t.today ? ' ring-2 ring-blue-500' : '') +
                      (isSelected ? ' ring-2 ring-offset-1 ring-purple-500' : '') +
                      (clickable ? ' hover:brightness-95 cursor-pointer' : ' cursor-default opacity-90')
                    }
                  >
                    {selectMode && (
                      <span className="absolute top-1 right-1 text-purple-600 dark:text-purple-300">
                        {isSelected ? <CheckSquare size={13} /> : <Square size={13} />}
                      </span>
                    )}
                    <p className="text-[11px] font-semibold leading-tight">Day {t.installmentNo}</p>
                    <p className="text-[11px] font-medium leading-tight mt-0.5">{formatDate(t.date)}</p>
                    <p className="text-[10px] leading-tight mt-1 font-semibold uppercase tracking-wide">{statusLabel(t.status)}</p>
                    {t.amount != null && (
                      <p className="text-[10px] leading-tight opacity-90 mt-0.5">{formatCurrency(t.amount)}</p>
                    )}
                  </button>
                )
              })}
            </div>
            <div className="flex flex-wrap gap-3 mt-3 text-[11px] text-gray-500 dark:text-gray-400">
              <LegendDot color="bg-green-100 border-green-300 text-green-700" label="Paid" />
              <LegendDot color="bg-yellow-100 border-yellow-300 text-yellow-700" label="Partial" />
              <LegendDot color="bg-purple-100 border-purple-300 text-purple-700" label="Advance" />
              <LegendDot color="bg-red-100 border-red-300 text-red-700" label="Not Paid" />
              <LegendDot color="bg-slate-200 border-slate-400 text-slate-700" label="Not Marked" />
              <LegendDot color="bg-blue-100 border-blue-300 text-blue-700" label="Due Today" />
              <LegendDot color="bg-gray-100 border-gray-300 text-gray-500" label="Pending (future)" />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader><CardTitle>Edit History</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
            {history.length === 0 && <p className="text-sm text-gray-400 dark:text-gray-500">No edits recorded yet — profile and payment edits will appear here.</p>}
            {history.map((h) => (
              <div key={h.id} className="flex items-start justify-between border border-gray-100 dark:border-gray-700 rounded-lg p-3 text-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge color={h.entity === 'Customer' ? 'blue' : 'purple'}>{h.entity}</Badge>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{h.field}</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span className="line-through text-red-500 dark:text-red-400">{h.oldValue || '—'}</span>
                    {' '}&rarr;{' '}
                    <span className="text-green-600 dark:text-green-400">{h.newValue || '—'}</span>
                  </p>
                  {h.reason && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Reason: {h.reason}</p>}
                </div>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 text-right whitespace-nowrap">
                  {h.editedBy}<br />{formatDate(h.dateTime)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {isAdmin && (
        <ConfirmDialog
          open={deleteConfirm}
          title="Delete customer?"
          message={`This will permanently remove ${customer.name} and their records. This action cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setDeleteConfirm(false)}
          danger
        />
      )}

      {isAdmin && (
        <ConfirmDialog
          open={closeConfirm}
          title="Close this account?"
          message={`${customer.name}'s loan is fully collected. Closing it removes this loan from active/Running totals across the app. This can't be undone from here.`}
          confirmLabel="Close Account"
          onConfirm={submitClose}
          onCancel={() => setCloseConfirm(false)}
        />
      )}

      {isAdmin && (
        <Dialog
          open={!!editPayment}
          onClose={() => setEditPayment(null)}
          title="Edit Payment"
          footer={
            <>
              <Button variant="secondary" onClick={() => setEditPayment(null)}>Cancel</Button>
              <Button onClick={submitEdit} disabled={!editForm.reason}>Save Changes</Button>
            </>
          }
        >
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
              <select className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm"
                value={editForm.type} onChange={(e) => handleEditTypeChange(e.target.value as PaymentType)}>
                <option value="Paid">Paid</option>
                <option value="Partial">Partial</option>
                <option value="NotPaid">Not Paid</option>
                <option value="Advance">Advance</option>
              </select>
            </div>
            {editForm.type === 'NotPaid' ? (
              <p className="text-xs text-gray-400 dark:text-gray-500">Not Paid always records Rs. 0 &mdash; no amount needed.</p>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {editForm.type === 'Advance' ? `Extra advance (on top of today's ${formatCurrency(installment)})` : 'Amount'}
                </label>
                <input type="number" className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm"
                  value={editForm.amount} onChange={(e) => setEditForm((f) => ({ ...f, amount: Number(e.target.value) }))} />
                {editForm.type === 'Advance' && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Total to be recorded: {formatCurrency(toTotal(editForm.amount))} ({formatCurrency(installment)} today + {formatCurrency(editForm.amount)} extra)
                  </p>
                )}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
              <input type="date" className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm"
                value={editForm.date} onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
              <input className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm"
                value={editForm.notes} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason for edit (required)</label>
              <input className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm"
                placeholder="e.g. Corrected wrong amount entry"
                value={editForm.reason} onChange={(e) => setEditForm((f) => ({ ...f, reason: e.target.value }))} />
            </div>
          </div>
        </Dialog>
      )}

      <Dialog
        open={!!addSlot}
        onClose={() => setAddSlot(null)}
        title={addSlot ? `Add Payment — Day ${addSlot.installmentNo} (${formatDate(addSlot.date)})` : 'Add Payment'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddSlot(null)}>Cancel</Button>
            <Button
              onClick={submitAddSlot}
              disabled={addSubmitting || (addForm.type !== 'NotPaid' && addForm.type !== 'Advance' && !(addForm.amount > 0))}
            >
              {addSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
            <select className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm"
              value={addForm.type} onChange={(e) => handleAddTypeChange(e.target.value as PaymentType)}>
              <option value="Paid">Paid</option>
              <option value="Partial">Partial</option>
              <option value="NotPaid">Not Paid</option>
              <option value="Advance">Advance</option>
            </select>
          </div>
          {addForm.type === 'NotPaid' ? (
            <p className="text-xs text-gray-400 dark:text-gray-500">Not Paid always records Rs. 0 for this day &mdash; no amount needed.</p>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {addForm.type === 'Advance'
                  ? `Extra advance (on top of today's ${formatCurrency(installment)})`
                  : addForm.type === 'Paid' && installment
                  ? `Amount (defaults to the daily installment, ${formatCurrency(installment)})`
                  : 'Amount'}
              </label>
              <input type="number" min={0} autoFocus
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm"
                value={addForm.amount} onChange={(e) => setAddForm((f) => ({ ...f, amount: Number(e.target.value) }))} />
              {addForm.type === 'Advance' && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Total to be recorded: {formatCurrency(toTotal(addForm.amount))} ({formatCurrency(installment)} today + {formatCurrency(addForm.amount)} extra)
                </p>
              )}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (optional)</label>
            <input className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm"
              value={addForm.notes} onChange={(e) => setAddForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
      </Dialog>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-sm sm:text-lg font-bold text-gray-900 dark:text-gray-100 mt-1">{value}</p>
    </Card>
  )
}

function FinanceField({ label, value, onChange, type = 'text' }: { label: string; value: any; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
      <input
        type={type}
        className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className="font-medium text-gray-900 dark:text-gray-100">{value}</span>
    </div>
  )
}

function timelineColor(status: string): string {
  switch (status) {
    case 'Paid': return 'bg-green-100 border-green-300 text-green-700'
    case 'Partial': return 'bg-yellow-100 border-yellow-300 text-yellow-700'
    case 'Advance': return 'bg-purple-100 border-purple-300 text-purple-700'
    // Explicit "Not Paid" (a collector visited and it genuinely wasn't paid) stays red.
    case 'NotPaid': return 'bg-red-100 border-red-300 text-red-700'
    // "Not Marked" (nobody ever recorded anything for that day) is a distinct neutral slate
    // color — it's not the same as a confirmed non-payment.
    case 'NotMarked': return 'bg-slate-200 border-slate-400 text-slate-700 dark:bg-slate-700 dark:border-slate-500 dark:text-slate-200'
    case 'Due': return 'bg-blue-100 border-blue-300 text-blue-700'
    default: return 'bg-gray-100 border-gray-300 text-gray-500'
  }
}

function statusLabel(status: string): string {
  return status === 'NotMarked' ? 'Not Marked' : status === 'NotPaid' ? 'Not Paid' : status
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`w-3 h-3 rounded-sm border inline-block ${color}`} />
      {label}
    </span>
  )
}
