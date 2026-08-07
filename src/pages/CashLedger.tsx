import React, { useEffect, useState } from 'react'
import { Wallet, Plus, Trash2, TrendingUp, TrendingDown, PiggyBank, IndianRupee } from 'lucide-react'
import { api } from '../api/client'
import { CashExpense, CashExpenseCategory, CashLedgerSummary } from '../types'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Dialog, ConfirmDialog } from '../components/ui/Dialog'
import { formatCurrency, formatDate } from '../utils/format'
import { useAuth } from '../context/AuthContext'

const CATEGORY_LABEL: Record<CashExpenseCategory, string> = {
  PetrolAllowance: 'Petrol Allowance',
  FoodAllowance: 'Food Allowance',
  Salary: 'Salary',
  SentToPerson: 'Sent to Person',
  Other: 'Other'
}

const SENT_VIA_OPTIONS = ['Cash', 'GPay', 'PhonePe', 'Paytm', 'Bank Transfer', 'Other']

export default function CashLedger() {
  const { user } = useAuth()
  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(today)
  const [summary, setSummary] = useState<CashLedgerSummary | null>(null)
  const [loading, setLoading] = useState(false)

  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({
    amount: 0, category: 'PetrolAllowance' as CashExpenseCategory, recipientName: '', sentVia: 'Cash', notes: ''
  })
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const load = () => {
    setLoading(true)
    api.get<CashLedgerSummary>('/cash-ledger/summary', { params: { date } })
      .then((r) => setSummary(r.data))
      .catch(() => setSummary(null))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [date])

  const openAdd = () => {
    setForm({ amount: 0, category: 'PetrolAllowance', recipientName: '', sentVia: 'Cash', notes: '' })
    setShowAdd(true)
  }

  const submitAdd = async () => {
    if (!form.amount || form.amount <= 0) return
    setSaving(true)
    try {
      await api.post('/cash-ledger/expenses', {
        date,
        amount: form.amount,
        category: form.category,
        recipientName: form.recipientName || null,
        sentVia: form.sentVia,
        notes: form.notes
      }, { params: { createdBy: user?.name } })
      setShowAdd(false)
      load()
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (deleteId == null) return
    await api.delete(`/cash-ledger/expenses/${deleteId}`)
    setDeleteId(null)
    load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Wallet className="text-blue-600" size={22} /> Cash Ledger
        </h1>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm"
          />
          <Button size="sm" onClick={openAdd}>
            <Plus size={16} /> Add Entry
          </Button>
        </div>
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500">
        Track what was collected today, what the owner sent through you (petrol, food, salary, or money to send someone),
        and what's left over — the leftover balance carries automatically into tomorrow.
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat
          label="Collected Today"
          value={summary ? formatCurrency(summary.collectedToday) : '—'}
          sub="From today's loan collections"
          icon={TrendingUp}
          color="text-green-600 bg-green-50 dark:bg-green-900/30"
        />
        <Stat
          label="Spent / Sent Today"
          value={summary ? formatCurrency(summary.expensesToday) : '—'}
          sub="Allowances, salary, transfers"
          icon={TrendingDown}
          color="text-red-600 bg-red-50 dark:bg-red-900/30"
        />
        <Stat
          label="Today's Balance After Spending"
          value={summary ? formatCurrency(summary.collectedToday - summary.expensesToday) : '—'}
          sub="Collected today minus spent today"
          icon={PiggyBank}
          color="text-amber-600 bg-amber-50 dark:bg-amber-900/30"
        />
        <Stat
          label="Total Balance (Carried Forward)"
          value={summary ? formatCurrency(summary.closingBalance) : '—'}
          sub={summary ? `Yesterday's balance ${formatCurrency(summary.openingBalance)} + today's` : 'Rolls into tomorrow'}
          icon={IndianRupee}
          color="text-blue-600 bg-blue-50 dark:bg-blue-900/30"
          highlight
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Entries for {formatDate(date)}</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-gray-100 dark:divide-gray-700">
          {loading && <p className="text-sm text-gray-400 dark:text-gray-500 py-4">Loading...</p>}
          {!loading && summary && summary.expenses.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500 py-4">No entries yet for this day.</p>
          )}
          {!loading && summary?.expenses.map((e) => (
            <div key={e.id} className="py-3 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge color="blue">{CATEGORY_LABEL[e.category]}</Badge>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(e.amount)}</span>
                  {e.sentVia && <span className="text-xs text-gray-400 dark:text-gray-500">via {e.sentVia}</span>}
                </div>
                {e.recipientName && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">To: {e.recipientName}</p>
                )}
                {e.notes && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{e.notes}</p>}
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">By {e.createdBy}</p>
              </div>
              <button onClick={() => setDeleteId(e.id)} className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 p-1">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add Cash Entry"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button disabled={saving} onClick={submitAdd}>{saving ? 'Saving...' : 'Save Entry'}</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Amount (Rs.)</label>
            <input type="number" value={form.amount || ''} onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))}
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Category</label>
            <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as CashExpenseCategory }))}
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm">
              {Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          {(form.category === 'SentToPerson' || form.category === 'Salary') && (
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Recipient Name</label>
              <input type="text" value={form.recipientName} onChange={(e) => setForm((f) => ({ ...f, recipientName: e.target.value }))}
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm" />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Sent Via</label>
            <select value={form.sentVia} onChange={(e) => setForm((f) => ({ ...f, sentVia: e.target.value }))}
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm">
              {SENT_VIA_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Notes (optional)</label>
            <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2}
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
      </Dialog>

      <ConfirmDialog
        open={deleteId != null}
        title="Delete this entry?"
        message="This will remove the entry and recalculate the balance for this and later days."
        confirmLabel="Delete"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}

function Stat({ label, value, sub, icon: Icon, color, highlight }: {
  label: string; value: string; sub?: string; icon: React.ElementType; color: string; highlight?: boolean
}) {
  return (
    <Card className={`p-3 ${highlight ? 'ring-2 ring-blue-500' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-0.5 truncate">{value}</p>
          {sub && <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
        </div>
        <div className={`p-2 rounded-lg shrink-0 ${color}`}>
          <Icon size={18} />
        </div>
      </div>
    </Card>
  )
}
