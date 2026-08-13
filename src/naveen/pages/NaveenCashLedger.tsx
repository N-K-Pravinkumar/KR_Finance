import React, { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Card, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Dialog, ConfirmDialog } from '../../components/ui/Dialog'
import { formatCurrency, formatDate } from '../../utils/format'
import { useAuth } from '../../context/AuthContext'
import { addCashEntry, deleteCashEntry, getCashSummary } from '../api/naveenApi'
import { NaveenCashDirection, NaveenCashSummary } from '../types'

const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100'

const Stat = ({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) => (
  <Card className="p-3 sm:p-4">
    <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
    <p className={`text-base sm:text-xl font-bold mt-1 break-words leading-snug ${highlight ? (value < 0 ? 'text-red-600' : 'text-blue-600') : 'text-gray-900 dark:text-gray-100'}`}>
      {formatCurrency(value)}
    </p>
  </Card>
)

export default function NaveenCashLedger() {
  const { user } = useAuth()
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [summary, setSummary] = useState<NaveenCashSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const [form, setForm] = useState({ direction: 'IN' as NaveenCashDirection, category: 'Vegetable Sale', amount: '', notes: '' })

  const load = () => {
    setLoading(true)
    getCashSummary(date).then(setSummary).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [date])

  const submitEntry = async () => {
    const amount = parseFloat(form.amount)
    if (isNaN(amount) || amount <= 0) return
    setSaving(true)
    try {
      await addCashEntry({ date, direction: form.direction, category: form.category, amount, notes: form.notes }, user?.name || 'system')
      setShowAdd(false)
      setForm({ direction: 'IN', category: 'Vegetable Sale', amount: '', notes: '' })
      load()
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (deleteId == null) return
    await deleteCashEntry(deleteId)
    setDeleteId(null)
    load()
  }

  if (loading || !summary) return <p className="text-sm text-gray-400 py-10 text-center">Loading...</p>

  const shortage = summary.closingBalance < 0

  return (
    <div className="space-y-4 py-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Cash Ledger</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Money in vs. out across every ledger, for one day</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
          <Button size="sm" onClick={() => setShowAdd(true)}><Plus size={16} /> Entry</Button>
        </div>
      </div>

      {shortage && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 text-sm text-red-700 dark:text-red-300 font-medium">
          Cash Shortage: {formatCurrency(Math.abs(summary.closingBalance))}
        </div>
      )}

      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Opening Balance" value={summary.openingBalance} />
        <Stat label="Total Inflow" value={summary.totalInflow} />
        <Stat label="Total Outflow" value={summary.totalOutflow} />
        <Stat label="Closing Balance" value={summary.closingBalance} highlight />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent>
            <p className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Cash Inflow</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Loan Collections</span><span className="font-medium">{formatCurrency(summary.loanCollections)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Other Income</span><span className="font-medium">{formatCurrency(summary.otherIncome)}</span></div>
              <div className="flex justify-between pt-2 border-t border-gray-100 dark:border-gray-700 font-semibold"><span>Total</span><span>{formatCurrency(summary.totalInflow)}</span></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Cash Outflow</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Supplier Payments</span><span className="font-medium">{formatCurrency(summary.supplierPayments)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Borrowing Repayments</span><span className="font-medium">{formatCurrency(summary.borrowingRepayments)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Other Expense</span><span className="font-medium">{formatCurrency(summary.otherExpense)}</span></div>
              <div className="flex justify-between pt-2 border-t border-gray-100 dark:border-gray-700 font-semibold"><span>Total</span><span>{formatCurrency(summary.totalOutflow)}</span></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent>
          <p className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Manual Entries</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                  <th className="py-1.5 pr-2">Category</th><th className="py-1.5 pr-2">Direction</th><th className="py-1.5 pr-2 text-right">Amount</th><th className="py-1.5 pr-2">Notes</th><th></th>
                </tr>
              </thead>
              <tbody>
                {summary.entries.map((e) => (
                  <tr key={e.id} className="border-b border-gray-50 dark:border-gray-700/50">
                    <td className="py-1.5 pr-2">{e.category}</td>
                    <td className={`py-1.5 pr-2 font-medium ${e.direction === 'IN' ? 'text-green-600' : 'text-red-600'}`}>{e.direction}</td>
                    <td className="py-1.5 pr-2 text-right font-medium">{formatCurrency(e.amount)}</td>
                    <td className="py-1.5 pr-2 text-gray-500 dark:text-gray-400">{e.notes}</td>
                    <td className="py-1.5 text-right">
                      <button onClick={() => setDeleteId(e.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
                {summary.entries.length === 0 && <tr><td colSpan={5} className="py-3 text-center text-gray-400">No manual entries for this day.</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showAdd} onClose={() => setShowAdd(false)} title={`Add Entry — ${formatDate(date)}`}
        footer={<><Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button><Button onClick={submitEntry} disabled={saving}>Save</Button></>}>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Direction</label>
            <select className={inputCls} value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value as NaveenCashDirection })}>
              <option value="IN">Money In</option>
              <option value="OUT">Money Out</option>
            </select>
          </div>
          <input className={inputCls} placeholder="Category (e.g. Vegetable Sale, Other Expense)" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <input type="number" className={inputCls} placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <input className={inputCls} placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
      </Dialog>

      <ConfirmDialog
        open={deleteId !== null}
        title="Delete Entry"
        message="Remove this cash entry? This can't be undone."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
        danger
      />
    </div>
  )
}
