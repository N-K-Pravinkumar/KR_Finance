import React, { useEffect, useMemo, useState } from 'react'
import { Search, Pencil, CheckCircle2, XCircle, Clock3, TrendingUp } from 'lucide-react'
import { api } from '../api/client'
import { QuickCollectionRow, PaymentType } from '../types'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Dialog } from '../components/ui/Dialog'
import { Button } from '../components/ui/Button'
import { formatCurrency, dueLabel, isOverdue, todayLocalISO, formatDate } from '../utils/format'
import { useAuth } from '../context/AuthContext'

type AmountAction = { row: QuickCollectionRow; type: 'Partial' | 'Advance' } | null
type EditAction = { row: QuickCollectionRow } | null

const TILE_STYLES: Record<PaymentType, { bg: string; text: string; ring: string }> = {
  Paid: { bg: 'bg-green-500 hover:bg-green-600', text: 'text-white', ring: 'ring-green-200' },
  Partial: { bg: 'bg-blue-500 hover:bg-blue-600', text: 'text-white', ring: 'ring-blue-200' },
  NotPaid: { bg: 'bg-red-500 hover:bg-red-600', text: 'text-white', ring: 'ring-red-200' },
  Advance: { bg: 'bg-amber-500 hover:bg-amber-600', text: 'text-white', ring: 'ring-amber-200' }
}

const TILE_LABEL: Record<PaymentType, string> = {
  Paid: 'Paid',
  Partial: 'Partial',
  NotPaid: 'Not Paid',
  Advance: 'Advance'
}

const TILE_ICON: Record<PaymentType, React.ElementType> = {
  Paid: CheckCircle2,
  Partial: Clock3,
  NotPaid: XCircle,
  Advance: TrendingUp
}

function ActionTile({ type, onClick, disabled }: { type: PaymentType; onClick: () => void; disabled?: boolean }) {
  const style = TILE_STYLES[type]
  const Icon = TILE_ICON[type]
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center justify-center gap-1 sm:gap-1.5 rounded-xl sm:rounded-2xl py-2 sm:py-3.5 ${style.bg} ${style.text} shadow-sm transition-transform active:scale-95 disabled:opacity-50 disabled:pointer-events-none`}
    >
      <span className="rounded-full border-2 border-white/70 p-1 sm:p-1.5">
        <Icon size={14} className="sm:hidden" />
        <Icon size={18} className="hidden sm:block" />
      </span>
      <span className="text-[10px] sm:text-xs font-semibold">{TILE_LABEL[type]}</span>
    </button>
  )
}

export default function QuickCollection() {
  const [rows, setRows] = useState<QuickCollectionRow[]>([])
  const [search, setSearch] = useState('')
  const [date, setDate] = useState(todayLocalISO())
  const [amountAction, setAmountAction] = useState<AmountAction>(null)
  const [amountValue, setAmountValue] = useState('')
  const [editAction, setEditAction] = useState<EditAction>(null)
  const [editForm, setEditForm] = useState({ type: 'Paid' as PaymentType, amount: '' })
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const { user } = useAuth()

  const today = todayLocalISO()
  const isToday = date === today

  const load = () => api.get<QuickCollectionRow[]>('/customers/quick-collection', { params: { date } }).then((r) => setRows(r.data))

  useEffect(() => { load() }, [date])

  useEffect(() => {
    if (!successMsg) return
    const t = setTimeout(() => setSuccessMsg(''), 2500)
    return () => clearTimeout(t)
  }, [successMsg])

  const filtered = useMemo(() => {
    return rows.filter(
      (c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.mobile.includes(search)
    )
  }, [rows, search])

  // Group loans by the person they belong to (groupKey), so someone with multiple running loans
  // shows as one card with every one of their loans for this date listed together. Groups where
  // every loan is already marked sink to the bottom of the list, most-recently-marked last.
  const grouped = useMemo(() => {
    const map = new Map<string, QuickCollectionRow[]>()
    for (const c of filtered) {
      const key = c.groupKey || `id-${c.customerId}`
      const arr = map.get(key) || []
      arr.push(c)
      map.set(key, arr)
    }
    const groups = Array.from(map.values())
    return groups.sort((a, b) => {
      const aDone = a.every((c) => c.paymentId != null)
      const bDone = b.every((c) => c.paymentId != null)
      if (aDone !== bDone) return aDone ? 1 : -1
      return a[0].name.localeCompare(b[0].name)
    })
  }, [filtered])

  const submitPayment = async (customerId: number, type: PaymentType, amount: number, note: string) => {
    await api.post('/payments', {
      customerId,
      date,
      amount,
      type,
      collectedBy: user?.name || 'Staff',
      notes: note
    })
  }

  const handleSimple = async (row: QuickCollectionRow, type: 'Paid' | 'NotPaid') => {
    setSubmitting(true)
    try {
      await submitPayment(
        row.customerId,
        type,
        type === 'Paid' ? row.installmentAmount : 0,
        type === 'Paid' ? 'Quick collection' : 'Marked not paid'
      )
      setSuccessMsg(`${row.name} marked as ${type === 'Paid' ? 'Paid' : 'Not Paid'}.`)
      load()
    } finally {
      setSubmitting(false)
    }
  }

  const handleAmountConfirm = async () => {
    if (!amountAction) return
    const entered = Number(amountValue)
    if (!(entered >= 0)) return
    // Advance means "today's installment, plus this much extra" — the entered value is the
    // extra on top, and the total actually recorded/charged includes today's amount too.
    const amount = amountAction.type === 'Advance' ? (amountAction.row.installmentAmount || 0) + entered : entered
    if (!(amount > 0)) return
    setSubmitting(true)
    try {
      await submitPayment(
        amountAction.row.customerId,
        amountAction.type,
        amount,
        amountAction.type === 'Partial' ? 'Partial payment via quick collection' : 'Advance payment via quick collection'
      )
      setSuccessMsg(`${amountAction.row.name}: ${amountAction.type} payment of ${formatCurrency(amount)} recorded.`)
      load()
    } finally {
      setSubmitting(false)
      setAmountAction(null)
      setAmountValue('')
    }
  }

  const openEdit = (row: QuickCollectionRow) => {
    setEditAction({ row })
    setEditForm({ type: row.paymentType || 'Paid', amount: String(row.paymentAmount ?? '') })
  }

  const handleEditConfirm = async () => {
    if (!editAction || editAction.row.paymentId == null) return
    const amount = Number(editForm.amount)
    if (!(amount >= 0)) return
    setSubmitting(true)
    try {
      await api.put(`/payments/${editAction.row.paymentId}`, {
        amount,
        type: editForm.type,
        editedBy: user?.name || 'Staff',
        reason: 'Edited via Quick Collection'
      })
      setSuccessMsg(`${editAction.row.name}'s entry updated.`)
      load()
    } finally {
      setSubmitting(false)
      setEditAction(null)
    }
  }

  return (
    <div className="space-y-4 py-2">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Quick Collection</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isToday
              ? "Customers due today (refreshes at 12:00 AM IST) — fast entry to mark today's collections."
              : `Viewing ${formatDate(date)} — mark or edit collections for this date.`}
          </p>
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm"
        />
      </div>

      {successMsg && (
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 text-sm rounded-lg px-4 py-2">
          {successMsg}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Search by name or mobile..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* max-height caps the list so roughly 3 cards are visible on mobile without scrolling the page itself */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
        {grouped.map((loans) => {
          const first = loans[0]
          return (
            <Card key={first.groupKey || first.customerId} className="p-2.5 sm:p-4">
              <div className="flex items-start justify-between mb-1.5 sm:mb-2">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm sm:text-base truncate">{first.name}</p>
                  <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">{first.mobile}</p>
                </div>
                {loans.length > 1 && <Badge color="purple">{loans.length} loans</Badge>}
              </div>

              <div className="space-y-2 sm:space-y-3">
                {loans.map((c) => {
                  const marked = c.paymentId != null
                  const overdue = isOverdue(c.nextDueDate, c.status)
                  return (
                    <div
                      key={c.customerId}
                      className={
                        (loans.length > 1 ? 'rounded-lg p-2 sm:p-2.5 border ' : 'rounded-lg p-1 border-l-4 ') +
                        (marked
                          ? 'border-gray-100 dark:border-gray-700 opacity-80'
                          : overdue
                          ? 'border-red-200 dark:border-red-800'
                          : (loans.length > 1 ? 'border-gray-100 dark:border-gray-700' : 'border-transparent'))
                      }
                    >
                      <div className="flex items-center justify-between mb-1 sm:mb-1.5">
                        <span className="text-[10px] sm:text-[11px] font-medium text-gray-400 dark:text-gray-500">
                          Loan #{c.customerId} &middot; {formatCurrency(c.financeAmount)}
                        </span>
                        {!marked && overdue && <Badge color="red">Overdue</Badge>}
                      </div>
                      <div className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mb-1.5 sm:mb-2 space-y-0.5">
                        <p>Installment: <span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(c.installmentAmount)}</span></p>
                        <p className="hidden sm:block">Due: <span className="font-medium text-gray-800 dark:text-gray-200">{dueLabel(c.nextDueDate, c.financeType)}</span></p>
                      </div>

                      {marked ? (
                        <div className="flex items-center justify-between gap-2">
                          <div className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${TILE_STYLES[c.paymentType!].bg} ${TILE_STYLES[c.paymentType!].text}`}>
                            {TILE_LABEL[c.paymentType!]} &middot; {formatCurrency(c.paymentAmount)}
                          </div>
                          <button onClick={() => openEdit(c)} className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 p-1">
                            <Pencil size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                          <ActionTile type="Paid" disabled={submitting} onClick={() => handleSimple(c, 'Paid')} />
                          <ActionTile type="Partial" disabled={submitting} onClick={() => { setAmountAction({ row: c, type: 'Partial' }); setAmountValue('') }} />
                          <ActionTile type="NotPaid" disabled={submitting} onClick={() => handleSimple(c, 'NotPaid')} />
                          <ActionTile type="Advance" disabled={submitting} onClick={() => { setAmountAction({ row: c, type: 'Advance' }); setAmountValue('') }} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </Card>
          )
        })}
        {grouped.length === 0 && (
          <p className="text-sm text-gray-400 dark:text-gray-500 col-span-full text-center py-10">
            {isToday
              ? 'No collections due right now. Already-marked loans stay off this list until the next day rolls over at 12:00 AM IST.'
              : 'No collections recorded for this date.'}
          </p>
        )}
      </div>

      <Dialog
        open={!!amountAction}
        onClose={() => setAmountAction(null)}
        title={`${amountAction?.type} Payment ${amountAction ? '- ' + amountAction.row.name : ''}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAmountAction(null)}>Cancel</Button>
            <Button
              onClick={handleAmountConfirm}
              disabled={!(Number(amountValue) > 0) || submitting}
            >
              {submitting ? 'Saving...' : 'Confirm'}
            </Button>
          </>
        }
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {amountAction?.type === 'Advance'
              ? `Extra advance (on top of today's ${formatCurrency(amountAction.row.installmentAmount)})`
              : 'Amount'}
          </label>
          <input
            type="number"
            min={amountAction?.type === 'Advance' ? 0 : 1}
            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm"
            value={amountValue}
            onChange={(e) => setAmountValue(e.target.value)}
            autoFocus
          />
          {amountAction?.type === 'Advance' && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Total to be recorded: {formatCurrency((amountAction.row.installmentAmount || 0) + (Number(amountValue) || 0))}
              {' '}({formatCurrency(amountAction.row.installmentAmount)} today + {formatCurrency(Number(amountValue) || 0)} extra)
            </p>
          )}
        </div>
      </Dialog>

      <Dialog
        open={!!editAction}
        onClose={() => setEditAction(null)}
        title={editAction ? `Edit Entry - ${editAction.row.name}` : 'Edit Entry'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditAction(null)}>Cancel</Button>
            <Button disabled={submitting} onClick={handleEditConfirm}>{submitting ? 'Saving...' : 'Save Changes'}</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Status</label>
            <select
              value={editForm.type}
              onChange={(e) => setEditForm((f) => ({ ...f, type: e.target.value as PaymentType }))}
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm"
            >
              <option value="Paid">Paid</option>
              <option value="Partial">Partial</option>
              <option value="NotPaid">Not Paid</option>
              <option value="Advance">Advance</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Amount (Rs.)</label>
            <input
              type="number"
              value={editForm.amount}
              onChange={(e) => setEditForm((f) => ({ ...f, amount: e.target.value }))}
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>
      </Dialog>
    </div>
  )
}
