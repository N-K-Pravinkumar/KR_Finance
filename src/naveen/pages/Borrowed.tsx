import React, { useEffect, useState } from 'react'
import { Plus, ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { formatCurrency, formatDate } from '../../utils/format'
import { useAuth } from '../../context/AuthContext'
import { addBorrowing, addBorrowingRepayment, listBorrowings } from '../api/naveenApi'
import { BorrowingSummary } from '../types'
import { NaveenTabs } from '../NaveenTabs'

const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100'

export default function Borrowed() {
  const { user } = useAuth()
  const [borrowings, setBorrowings] = useState<BorrowingSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showRepay, setShowRepay] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({ lenderName: '', mobile: '', amount: '', date: new Date().toISOString().slice(0, 10), interestPercent: '', notes: '' })
  const [repayForm, setRepayForm] = useState({ date: new Date().toISOString().slice(0, 10), amount: '', notes: '' })

  const load = () => {
    setLoading(true)
    listBorrowings().then(setBorrowings).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const submitBorrowing = async () => {
    const amount = parseFloat(form.amount)
    if (!form.lenderName.trim() || isNaN(amount)) return
    setSaving(true)
    try {
      await addBorrowing({
        lenderName: form.lenderName, mobile: form.mobile, amount, date: form.date,
        interestPercent: form.interestPercent ? parseFloat(form.interestPercent) : undefined, notes: form.notes
      })
      setShowAdd(false)
      setForm({ lenderName: '', mobile: '', amount: '', date: new Date().toISOString().slice(0, 10), interestPercent: '', notes: '' })
      load()
    } finally {
      setSaving(false)
    }
  }

  const submitRepayment = async (id: number) => {
    const amount = parseFloat(repayForm.amount)
    if (isNaN(amount) || amount <= 0) return
    setSaving(true)
    try {
      await addBorrowingRepayment(id, { date: repayForm.date, amount, notes: repayForm.notes }, user?.name || 'system')
      setShowRepay(null)
      setRepayForm({ date: new Date().toISOString().slice(0, 10), amount: '', notes: '' })
      load()
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-sm text-gray-400 py-10 text-center">Loading...</p>

  return (
    <div className="space-y-4 py-2">
      <NaveenTabs />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Money Borrowed</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Money you've borrowed and need to repay</p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)}><Plus size={16} /> Add Borrowing</Button>
      </div>

      <div className="space-y-3">
        {borrowings.map((b) => (
          <Card key={b.borrowing.id}>
            <button
              className="w-full flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 text-left"
              onClick={() => setExpanded(expanded === b.borrowing.id ? null : b.borrowing.id)}
            >
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{b.borrowing.lenderName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Borrowed {formatCurrency(b.borrowing.amount)} on {formatDate(b.borrowing.date)}</p>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Balance</p>
                  <p className={`font-bold ${b.balance > 0.5 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(b.balance)}</p>
                </div>
                {expanded === b.borrowing.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>
            </button>

            {expanded === b.borrowing.id && (
              <CardContent className="border-t border-gray-100 dark:border-gray-700 space-y-4">
                <div className="grid grid-cols-3 gap-3 text-center text-sm">
                  <div><p className="text-gray-500 dark:text-gray-400 text-xs">Total Payable</p><p className="font-semibold">{formatCurrency(b.totalPayable)}</p></div>
                  <div><p className="text-gray-500 dark:text-gray-400 text-xs">Total Repaid</p><p className="font-semibold text-green-600">{formatCurrency(b.totalRepaid)}</p></div>
                  <div><p className="text-gray-500 dark:text-gray-400 text-xs">Balance</p><p className="font-semibold text-red-600">{formatCurrency(b.balance)}</p></div>
                </div>

                <Button size="sm" variant="success" onClick={() => setShowRepay(b.borrowing.id)}>+ Repayment</Button>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                        <th className="py-1.5 pr-2">Date</th><th className="py-1.5 pr-2">Transaction</th><th className="py-1.5 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-50 dark:border-gray-700/50">
                        <td className="py-1.5 pr-2">{formatDate(b.borrowing.date)}</td>
                        <td className="py-1.5 pr-2">Amount Borrowed</td>
                        <td className="py-1.5 text-right font-medium">+{formatCurrency(b.borrowing.amount)}</td>
                      </tr>
                      {b.repayments.map((r) => (
                        <tr key={r.id} className="border-b border-gray-50 dark:border-gray-700/50 bg-green-50/50 dark:bg-green-900/10">
                          <td className="py-1.5 pr-2">{formatDate(r.date)}</td>
                          <td className="py-1.5 pr-2 text-green-700 dark:text-green-400">Repayment {r.notes ? `— ${r.notes}` : ''}</td>
                          <td className="py-1.5 text-right font-medium text-green-700 dark:text-green-400">-{formatCurrency(r.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
        {borrowings.length === 0 && <p className="text-sm text-gray-400 text-center py-10">No borrowings added yet.</p>}
      </div>

      <Dialog open={showAdd} onClose={() => setShowAdd(false)} title="Add Borrowing"
        footer={<><Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button><Button onClick={submitBorrowing} disabled={saving}>Save</Button></>}>
        <div className="space-y-3">
          <input className={inputCls} placeholder="Lender Name" value={form.lenderName} onChange={(e) => setForm({ ...form, lenderName: e.target.value })} />
          <input className={inputCls} placeholder="Mobile" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
          <input type="number" className={inputCls} placeholder="Amount Borrowed" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <input type="date" className={inputCls} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <input type="number" className={inputCls} placeholder="Interest % (optional, leave blank if none)" value={form.interestPercent} onChange={(e) => setForm({ ...form, interestPercent: e.target.value })} />
          <input className={inputCls} placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
      </Dialog>

      <Dialog open={showRepay !== null} onClose={() => setShowRepay(null)} title="Record Repayment"
        footer={<><Button variant="secondary" onClick={() => setShowRepay(null)}>Cancel</Button><Button variant="success" onClick={() => showRepay && submitRepayment(showRepay)} disabled={saving}>Save</Button></>}>
        <div className="space-y-3">
          <input type="date" className={inputCls} value={repayForm.date} onChange={(e) => setRepayForm({ ...repayForm, date: e.target.value })} />
          <input type="number" className={inputCls} placeholder="Amount" value={repayForm.amount} onChange={(e) => setRepayForm({ ...repayForm, amount: e.target.value })} />
          <input className={inputCls} placeholder="Notes (optional)" value={repayForm.notes} onChange={(e) => setRepayForm({ ...repayForm, notes: e.target.value })} />
        </div>
      </Dialog>
    </div>
  )
}
