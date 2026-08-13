import React, { useEffect, useState } from 'react'
import { Plus, ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { Badge } from '../../components/ui/Badge'
import { formatCurrency, formatDate } from '../../utils/format'
import { useAuth } from '../../context/AuthContext'
import { addLoan, listLoans, recordLoanPayment } from '../api/naveenApi'
import { LoanSummary, NaveenLoanFrequency, NaveenPaymentType } from '../types'

const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100'
const frequencies: NaveenLoanFrequency[] = ['Daily', 'Weekly', 'Monthly', 'Custom']
const paymentTypes: NaveenPaymentType[] = ['Paid', 'Partial', 'NotPaid', 'Advance']

export default function Loans() {
  const { user } = useAuth()
  const [loans, setLoans] = useState<LoanSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showCollect, setShowCollect] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    borrowerName: '', mobile: '', address: '', amount: '', date: new Date().toISOString().slice(0, 10),
    frequency: 'Daily' as NaveenLoanFrequency, installmentAmount: '', totalInstallments: '100'
  })
  const [collectForm, setCollectForm] = useState({ date: new Date().toISOString().slice(0, 10), amount: '', type: 'Paid' as NaveenPaymentType, collectedBy: user?.name || '', notes: '' })

  const load = () => {
    setLoading(true)
    listLoans().then(setLoans).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const submitLoan = async () => {
    const amount = parseFloat(form.amount)
    if (!form.borrowerName.trim() || isNaN(amount)) return
    setSaving(true)
    try {
      await addLoan({
        borrowerName: form.borrowerName, mobile: form.mobile, address: form.address, amount, date: form.date,
        frequency: form.frequency,
        installmentAmount: form.installmentAmount ? parseFloat(form.installmentAmount) : undefined,
        totalInstallments: form.totalInstallments ? parseInt(form.totalInstallments, 10) : undefined
      })
      setShowAdd(false)
      setForm({ borrowerName: '', mobile: '', address: '', amount: '', date: new Date().toISOString().slice(0, 10), frequency: 'Daily', installmentAmount: '', totalInstallments: '100' })
      load()
    } finally {
      setSaving(false)
    }
  }

  const submitCollection = async (loanId: number) => {
    const amount = parseFloat(collectForm.amount) || 0
    setSaving(true)
    try {
      await recordLoanPayment(loanId, { date: collectForm.date, amount, type: collectForm.type, collectedBy: collectForm.collectedBy || 'system', notes: collectForm.notes })
      setShowCollect(null)
      setCollectForm({ date: new Date().toISOString().slice(0, 10), amount: '', type: 'Paid', collectedBy: user?.name || '', notes: '' })
      load()
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-sm text-gray-400 py-10 text-center">Loading...</p>

  return (
    <div className="space-y-4 py-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Money Given</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Loans you've given out, collected daily/weekly/monthly</p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)}><Plus size={16} /> Add Loan</Button>
      </div>

      <div className="space-y-3">
        {loans.map((l) => (
          <Card key={l.loan.id}>
            <button
              className="w-full flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 text-left"
              onClick={() => setExpanded(expanded === l.loan.id ? null : l.loan.id)}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{l.loan.borrowerName}</p>
                  <Badge>{l.loan.status}</Badge>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{l.loan.frequency} · {formatCurrency(l.loan.installmentAmount)}/period</p>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Balance</p>
                  <p className={`font-bold ${l.loan.pendingAmount > 0.5 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(l.loan.pendingAmount)}</p>
                </div>
                {expanded === l.loan.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>
            </button>

            {expanded === l.loan.id && (
              <CardContent className="border-t border-gray-100 dark:border-gray-700 space-y-4">
                <div className="grid grid-cols-3 gap-3 text-center text-sm">
                  <div><p className="text-gray-500 dark:text-gray-400 text-xs">Loan Amount</p><p className="font-semibold">{formatCurrency(l.loan.amount)}</p></div>
                  <div><p className="text-gray-500 dark:text-gray-400 text-xs">Total Collected</p><p className="font-semibold text-green-600">{formatCurrency(l.loan.totalPaid)}</p></div>
                  <div><p className="text-gray-500 dark:text-gray-400 text-xs">Balance</p><p className="font-semibold text-red-600">{formatCurrency(l.loan.pendingAmount)}</p></div>
                </div>

                <Button size="sm" onClick={() => { setCollectForm({ ...collectForm, amount: String(l.loan.installmentAmount || '') }); setShowCollect(l.loan.id) }}>
                  + Record Collection
                </Button>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                        <th className="py-1.5 pr-2">Date</th><th className="py-1.5 pr-2">Status</th><th className="py-1.5 pr-2 text-right">Amount</th><th className="py-1.5">Collected By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {l.payments.map((p) => (
                        <tr key={p.id} className="border-b border-gray-50 dark:border-gray-700/50">
                          <td className="py-1.5 pr-2">{formatDate(p.date)}</td>
                          <td className="py-1.5 pr-2"><Badge>{p.type}</Badge></td>
                          <td className="py-1.5 pr-2 text-right font-medium">{formatCurrency(p.amount)}</td>
                          <td className="py-1.5">{p.collectedBy}</td>
                        </tr>
                      ))}
                      {l.payments.length === 0 && <tr><td colSpan={4} className="py-3 text-center text-gray-400">No collections recorded yet.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
        {loans.length === 0 && <p className="text-sm text-gray-400 text-center py-10">No loans added yet.</p>}
      </div>

      <Dialog open={showAdd} onClose={() => setShowAdd(false)} title="Add Loan (Money Given)"
        footer={<><Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button><Button onClick={submitLoan} disabled={saving}>Save</Button></>}>
        <div className="space-y-3">
          <input className={inputCls} placeholder="Borrower Name" value={form.borrowerName} onChange={(e) => setForm({ ...form, borrowerName: e.target.value })} />
          <input className={inputCls} placeholder="Mobile" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
          <input className={inputCls} placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <input type="number" className={inputCls} placeholder="Amount Given" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <input type="date" className={inputCls} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Collection Frequency</label>
            <select className={inputCls} value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value as NaveenLoanFrequency })}>
              {frequencies.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="number" className={inputCls} placeholder="Installment Amount" value={form.installmentAmount} onChange={(e) => setForm({ ...form, installmentAmount: e.target.value })} />
            <input type="number" className={inputCls} placeholder="Total Installments" value={form.totalInstallments} onChange={(e) => setForm({ ...form, totalInstallments: e.target.value })} />
          </div>
        </div>
      </Dialog>

      <Dialog open={showCollect !== null} onClose={() => setShowCollect(null)} title="Record Collection"
        footer={<><Button variant="secondary" onClick={() => setShowCollect(null)}>Cancel</Button><Button onClick={() => showCollect && submitCollection(showCollect)} disabled={saving}>Save</Button></>}>
        <div className="space-y-3">
          <input type="date" className={inputCls} value={collectForm.date} onChange={(e) => setCollectForm({ ...collectForm, date: e.target.value })} />
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Status</label>
            <select className={inputCls} value={collectForm.type} onChange={(e) => setCollectForm({ ...collectForm, type: e.target.value as NaveenPaymentType })}>
              {paymentTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <input type="number" className={inputCls} placeholder="Amount" value={collectForm.amount} onChange={(e) => setCollectForm({ ...collectForm, amount: e.target.value })} />
          <input className={inputCls} placeholder="Collected By" value={collectForm.collectedBy} onChange={(e) => setCollectForm({ ...collectForm, collectedBy: e.target.value })} />
          <input className={inputCls} placeholder="Notes (optional)" value={collectForm.notes} onChange={(e) => setCollectForm({ ...collectForm, notes: e.target.value })} />
        </div>
      </Dialog>
    </div>
  )
}
