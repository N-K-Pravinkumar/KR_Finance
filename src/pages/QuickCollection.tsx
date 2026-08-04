import React, { useEffect, useMemo, useState } from 'react'
import { Search, CheckCircle2, XCircle, Clock3, TrendingUp } from 'lucide-react'
import { api } from '../api/client'
import { Customer } from '../types'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { ConfirmDialog, Dialog } from '../components/ui/Dialog'
import { formatCurrency, dueLabel, isOverdue } from '../utils/format'
import { useAuth } from '../context/AuthContext'

type SimpleAction = { customer: Customer; type: 'Paid' | 'NotPaid' } | null
type AmountAction = { customer: Customer; type: 'Partial' | 'Advance' } | null

export default function QuickCollection() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [pending, setPending] = useState<SimpleAction>(null)
  const [amountAction, setAmountAction] = useState<AmountAction>(null)
  const [amountValue, setAmountValue] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const { user } = useAuth()

  const load = () => api.get('/customers/due-today').then((r) => setCustomers(r.data))

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!successMsg) return
    const t = setTimeout(() => setSuccessMsg(''), 2500)
    return () => clearTimeout(t)
  }, [successMsg])

  const filtered = useMemo(() => {
    return customers.filter(
      (c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.mobile.includes(search)
    )
  }, [customers, search])

  // Group loans due today by the person they belong to (groupKey), so someone with multiple
  // running loans shows as one card with every one of their due loans listed together instead
  // of scattered separately across the grid.
  const grouped = useMemo(() => {
    const map = new Map<string, Customer[]>()
    for (const c of filtered) {
      const key = c.groupKey || `id-${c.id}`
      const arr = map.get(key) || []
      arr.push(c)
      map.set(key, arr)
    }
    return Array.from(map.values()).sort((a, b) => a[0].name.localeCompare(b[0].name))
  }, [filtered])

  const submitPayment = async (customerId: number, type: 'Paid' | 'Partial' | 'NotPaid' | 'Advance', amount: number, note: string) => {
    await api.post('/payments', {
      customerId,
      date: new Date().toISOString().slice(0, 10),
      amount,
      type,
      collectedBy: user?.name || 'Staff',
      notes: note
    })
  }

  const handleConfirm = async () => {
    if (!pending) return
    setSubmitting(true)
    try {
      await submitPayment(
        pending.customer.id,
        pending.type,
        pending.type === 'Paid' ? pending.customer.installmentAmount : 0,
        pending.type === 'Paid' ? 'Quick collection' : 'Marked not paid'
      )
      setCustomers((prev) => prev.filter((c) => c.id !== pending.customer.id))
      setSuccessMsg(`${pending.customer.name} marked as ${pending.type === 'Paid' ? 'Paid' : 'Not Paid'}.`)
      load()
    } finally {
      setSubmitting(false)
      setPending(null)
    }
  }

  const handleAmountConfirm = async () => {
    if (!amountAction) return
    const amount = Number(amountValue)
    if (!(amount > 0)) return
    setSubmitting(true)
    try {
      await submitPayment(
        amountAction.customer.id,
        amountAction.type,
        amount,
        amountAction.type === 'Partial' ? 'Partial payment via quick collection' : 'Advance payment via quick collection'
      )
      setCustomers((prev) => prev.filter((c) => c.id !== amountAction.customer.id))
      setSuccessMsg(`${amountAction.customer.name}: ${amountAction.type} payment of ${formatCurrency(amount)} recorded.`)
      load()
    } finally {
      setSubmitting(false)
      setAmountAction(null)
      setAmountValue('')
    }
  }

  return (
    <div className="space-y-4 py-2">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Quick Collection</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Customers due today (refreshes at 12:00 AM IST) &mdash; fast entry to mark today&apos;s collections. Customers with multiple loans show all their due loans together.
        </p>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {grouped.map((loans) => {
          const first = loans[0]
          return (
            <Card key={first.groupKey || first.id} className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{first.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{first.mobile}</p>
                </div>
                {loans.length > 1 && <Badge color="purple">{loans.length} loans due</Badge>}
              </div>

              <div className="space-y-3">
                {loans.map((c) => {
                  const isPartial = c.lastPaymentType === 'Partial'
                  return (
                  <div
                    key={c.id}
                    className={
                      (loans.length > 1 ? 'rounded-lg p-2.5 border ' : 'rounded-lg p-1 border-l-4 ') +
                      (isPartial
                        ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20'
                        : (loans.length > 1 ? 'border-gray-100 dark:border-gray-700' : 'border-transparent'))
                    }
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500">
                        Loan #{c.id} &middot; {formatCurrency(c.financeAmount)}
                      </span>
                      {isOverdue(c.nextDueDate, c.status) ? (
                        <Badge color="red">Overdue</Badge>
                      ) : isPartial ? (
                        <Badge color="yellow">Partial Pending</Badge>
                      ) : (
                        <Badge color="blue">{c.financeType}</Badge>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 space-y-0.5">
                      <p>Today&apos;s installment: <span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(c.installmentAmount)}</span></p>
                      <p>Due: <span className="font-medium text-gray-800 dark:text-gray-200">{dueLabel(c.nextDueDate, c.financeType)}</span></p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button size="sm" variant="success" onClick={() => setPending({ customer: c, type: 'Paid' })}>
                        <CheckCircle2 size={14} /> Paid Today
                      </Button>
                      <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white" onClick={() => { setAmountAction({ customer: c, type: 'Partial' }); setAmountValue('') }}>
                        <Clock3 size={14} /> Partial
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => setPending({ customer: c, type: 'NotPaid' })}>
                        <XCircle size={14} /> Not Paid
                      </Button>
                      <Button size="sm" className="bg-blue-500 hover:bg-blue-600 text-white" onClick={() => { setAmountAction({ customer: c, type: 'Advance' }); setAmountValue('') }}>
                        <TrendingUp size={14} /> Advance
                      </Button>
                    </div>
                  </div>
                  )
                })}
              </div>
            </Card>
          )
        })}
        {grouped.length === 0 && (
          <p className="text-sm text-gray-400 dark:text-gray-500 col-span-full text-center py-10">
            No collections due right now. Today&apos;s installments appear here after 12:00 PM.
          </p>
        )}
      </div>

      <ConfirmDialog
        open={!!pending}
        title={`Mark as ${pending?.type === 'Paid' ? 'Paid' : 'Not Paid'}?`}
        message={`Are you sure you want to mark ${pending?.customer.name}'s payment as ${
          pending?.type === 'Paid' ? 'Paid' : 'Not Paid'
        }?`}
        confirmLabel={submitting ? 'Saving...' : 'Confirm'}
        onConfirm={handleConfirm}
        onCancel={() => setPending(null)}
        danger={pending?.type === 'NotPaid'}
      />

      <Dialog
        open={!!amountAction}
        onClose={() => setAmountAction(null)}
        title={`${amountAction?.type} Payment ${amountAction ? '- ' + amountAction.customer.name : ''}`}
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
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount</label>
          <input
            type="number"
            min={1}
            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm"
            value={amountValue}
            onChange={(e) => setAmountValue(e.target.value)}
            autoFocus
          />
        </div>
      </Dialog>
    </div>
  )
}
