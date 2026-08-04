import React, { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { MessageCircle, MessageSquare, Pencil, CheckCircle2, XCircle, ArrowLeft, Trash2 } from 'lucide-react'
import { api } from '../api/client'
import { Customer, Payment, PaymentType, AuditEntry } from '../types'
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
  const [history, setHistory] = useState<AuditEntry[]>([])
  const [otherLoans, setOtherLoans] = useState<Customer[]>([])
  const [pendingAction, setPendingAction] = useState<'Paid' | 'NotPaid' | null>(null)
  const [editPayment, setEditPayment] = useState<Payment | null>(null)
  const [editForm, setEditForm] = useState({ amount: 0, date: '', notes: '', reason: '', type: 'Paid' as PaymentType })
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const load = () => {
    api.get<Customer>(`/customers/${id}`).then((r) => setCustomer(r.data))
    api.get<Payment[]>(`/payments/customer/${id}`).then((r) => setPayments(r.data))
    api.get<AuditEntry[]>(`/audit-logs/customer/${id}`).then((r) => setHistory(r.data)).catch(() => setHistory([]))
    api.get<Customer[]>(`/customers/${id}/other-loans`).then((r) => setOtherLoans(r.data)).catch(() => setOtherLoans([]))
  }

  useEffect(() => { load() }, [id])

  if (!customer) return <p className="text-sm text-gray-400 dark:text-gray-500 py-10 text-center">Loading...</p>

  const handleMarkPayment = async () => {
    if (!pendingAction) return
    await api.post('/payments', {
      customerId: customer.id,
      date: new Date().toISOString().slice(0, 10),
      amount: pendingAction === 'Paid' ? customer.installmentAmount : 0,
      type: pendingAction,
      collectedBy: user?.name || 'Staff',
      notes: pendingAction === 'Paid' ? 'Marked paid from detail page' : 'Marked not paid'
    })
    setPendingAction(null)
    load()
  }

  const openEdit = (p: Payment) => {
    setEditPayment(p)
    setEditForm({ amount: p.amount, date: p.date.slice(0, 10), notes: p.notes || '', reason: '', type: p.type })
  }

  const submitEdit = async () => {
    if (!editPayment) return
    await api.put(`/payments/${editPayment.id}`, {
      amount: editForm.amount,
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
            <Button variant="success" size="sm"><MessageCircle size={14} /> WhatsApp Reminder</Button>
          </a>
          <a href={smsLink}>
            <Button variant="secondary" size="sm"><MessageSquare size={14} /> SMS Reminder</Button>
          </a>
          {isAdmin && (
            <Link to={`/customers/${customer.id}/edit`}>
              <Button variant="secondary" size="sm"><Pencil size={14} /> Edit</Button>
            </Link>
          )}
          {isAdmin && (
            <Button variant="danger" size="sm" onClick={() => setDeleteConfirm(true)}><Trash2 size={14} /> Delete</Button>
          )}
        </div>
      </div>

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
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Finance Summary</h3>
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

          {customer.status === 'Running' && (
            <div className="flex gap-2 pt-3">
              <Button size="sm" variant="success" className="flex-1" onClick={() => setPendingAction('Paid')}>
                <CheckCircle2 size={14} /> Paid
              </Button>
              <Button size="sm" variant="danger" className="flex-1" onClick={() => setPendingAction('NotPaid')}>
                <XCircle size={14} /> Not Paid
              </Button>
            </div>
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

      <ConfirmDialog
        open={!!pendingAction}
        title={`Mark as ${pendingAction === 'Paid' ? 'Paid' : 'Not Paid'}?`}
        message={`Are you sure you want to mark this as ${pendingAction === 'Paid' ? 'Paid' : 'Not Paid'}?`}
        onConfirm={handleMarkPayment}
        onCancel={() => setPendingAction(null)}
        danger={pendingAction === 'NotPaid'}
      />

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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount</label>
              <input type="number" className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm"
                value={editForm.amount} onChange={(e) => setEditForm((f) => ({ ...f, amount: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
              <select className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm"
                value={editForm.type} onChange={(e) => setEditForm((f) => ({ ...f, type: e.target.value as PaymentType }))}>
                <option value="Paid">Paid</option>
                <option value="Partial">Partial</option>
                <option value="NotPaid">Not Paid</option>
                <option value="Advance">Advance</option>
              </select>
            </div>
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className="font-medium text-gray-900 dark:text-gray-100">{value}</span>
    </div>
  )
}
