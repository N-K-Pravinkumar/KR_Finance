import React, { useEffect, useState } from 'react'
import { Plus, ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react'
import { Card, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Dialog, ConfirmDialog } from '../../components/ui/Dialog'
import { Badge } from '../../components/ui/Badge'
import { formatCurrency, formatDate } from '../../utils/format'
import { useAuth } from '../../context/AuthContext'
import {
  addLoan, deleteLoan, deleteLoanPayment, listLoans, recordLoanPayment, updateLoan, updateLoanPayment
} from '../api/naveenApi'
import { LoanSummary, NaveenLoan, NaveenLoanFrequency, NaveenLoanPayment, NaveenPaymentType } from '../types'
import { NaveenTotals } from '../NaveenTotals'
import { NaveenLoading } from '../NaveenLoading'

const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100'
const frequencies: NaveenLoanFrequency[] = ['Daily', 'Weekly', 'Monthly', 'Custom']
const paymentTypes: NaveenPaymentType[] = ['Paid', 'Partial', 'NotPaid', 'Advance']
const today = () => new Date().toISOString().slice(0, 10)

type DeleteTarget = { kind: 'loan' | 'payment'; id: number; label: string }

export default function Loans() {
  const { user } = useAuth()
  const [loans, setLoans] = useState<LoanSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const [showAdd, setShowAdd] = useState(false)
  const [editLoanId, setEditLoanId] = useState<number | null>(null)
  const [form, setForm] = useState({
    borrowerName: '', mobile: '', address: '', amount: '', date: today(),
    frequency: 'Daily' as NaveenLoanFrequency, installmentAmount: '', totalInstallments: '100'
  })

  const [showCollect, setShowCollect] = useState<number | null>(null)
  const [editPayment, setEditPayment] = useState<NaveenLoanPayment | null>(null)
  const [collectForm, setCollectForm] = useState({ date: today(), amount: '', type: 'Paid' as NaveenPaymentType, collectedBy: user?.name || '', notes: '' })

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)

  const load = () => {
    setLoading(true)
    listLoans().then(setLoans).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const totals = loans.reduce((acc, l) => ({
    amount: acc.amount + (l.loan.amount || 0),
    paid: acc.paid + (l.loan.totalPaid || 0),
    pending: acc.pending + (l.loan.pendingAmount || 0)
  }), { amount: 0, paid: 0, pending: 0 })

  const openAdd = () => {
    setEditLoanId(null)
    setForm({ borrowerName: '', mobile: '', address: '', amount: '', date: today(), frequency: 'Daily', installmentAmount: '', totalInstallments: '100' })
    setShowAdd(true)
  }
  const openEdit = (l: NaveenLoan) => {
    setEditLoanId(l.id)
    setForm({
      borrowerName: l.borrowerName, mobile: l.mobile || '', address: l.address || '', amount: String(l.amount ?? ''), date: l.date,
      frequency: l.frequency, installmentAmount: String(l.installmentAmount ?? ''), totalInstallments: String(l.totalInstallments ?? '100')
    })
    setShowAdd(true)
  }

  const submitLoan = async () => {
    const amount = parseFloat(form.amount)
    if (!form.borrowerName.trim() || isNaN(amount)) return
    setSaving(true)
    try {
      const payload = {
        borrowerName: form.borrowerName, mobile: form.mobile, address: form.address, amount, date: form.date,
        frequency: form.frequency,
        installmentAmount: form.installmentAmount ? parseFloat(form.installmentAmount) : undefined,
        totalInstallments: form.totalInstallments ? parseInt(form.totalInstallments, 10) : undefined
      }
      if (editLoanId != null) await updateLoan(editLoanId, payload)
      else await addLoan(payload)
      setShowAdd(false)
      load()
    } finally {
      setSaving(false)
    }
  }

  const openAddCollect = (l: NaveenLoan) => {
    setEditPayment(null)
    setCollectForm({ date: today(), amount: String(l.installmentAmount || ''), type: 'Paid', collectedBy: user?.name || '', notes: '' })
    setShowCollect(l.id)
  }
  const openEditCollect = (loanId: number, p: NaveenLoanPayment) => {
    setEditPayment(p)
    setCollectForm({ date: p.date, amount: String(p.amount ?? ''), type: p.type, collectedBy: p.collectedBy || '', notes: p.notes || '' })
    setShowCollect(loanId)
  }

  const submitCollection = async (loanId: number) => {
    const amount = parseFloat(collectForm.amount) || 0
    setSaving(true)
    try {
      if (editPayment) {
        await updateLoanPayment(editPayment.id, { date: collectForm.date, amount, type: collectForm.type, collectedBy: collectForm.collectedBy || 'system', notes: collectForm.notes })
      } else {
        await recordLoanPayment(loanId, { date: collectForm.date, amount, type: collectForm.type, collectedBy: collectForm.collectedBy || 'system', notes: collectForm.notes })
      }
      setShowCollect(null)
      load()
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    if (deleteTarget.kind === 'loan') await deleteLoan(deleteTarget.id)
    else await deleteLoanPayment(deleteTarget.id)
    setDeleteTarget(null)
    load()
  }

  if (loading) return <NaveenLoading label="Loading loans..." />

  return (
    <div className="space-y-4 py-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Money Given</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Loans you've given out, collected daily/weekly/monthly</p>
        </div>
        <Button size="sm" onClick={openAdd}><Plus size={16} /> Add Loan</Button>
      </div>

      <NaveenTotals totalAmount={totals.amount} totalPaid={totals.paid} totalPending={totals.pending} amountLabel="Total Given" />

      <div className="space-y-3">
        {loans.map((l) => (
          <Card key={l.loan.id}>
            <div className="w-full flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 gap-2">
              <button className="flex-1 text-left min-w-0" onClick={() => setExpanded(expanded === l.loan.id ? null : l.loan.id)}>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{l.loan.borrowerName}</p>
                  <Badge>{l.loan.status}</Badge>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{l.loan.frequency} · {formatCurrency(l.loan.installmentAmount)}/period</p>
              </button>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Balance</p>
                  <p className={`font-bold ${l.loan.pendingAmount > 0.5 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(l.loan.pendingAmount)}</p>
                </div>
                <button onClick={() => openEdit(l.loan)} className="text-gray-400 hover:text-blue-600 p-1"><Pencil size={15} /></button>
                <button onClick={() => setDeleteTarget({ kind: 'loan', id: l.loan.id, label: `loan for "${l.loan.borrowerName}" and all collections` })} className="text-gray-400 hover:text-red-600 p-1"><Trash2 size={15} /></button>
                <button onClick={() => setExpanded(expanded === l.loan.id ? null : l.loan.id)} className="text-gray-400 p-1">
                  {expanded === l.loan.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
              </div>
            </div>

            {expanded === l.loan.id && (
              <CardContent className="border-t border-gray-100 dark:border-gray-700 space-y-4">
                <div className="grid grid-cols-3 gap-3 text-center text-sm">
                  <div><p className="text-gray-500 dark:text-gray-400 text-xs">Loan Amount</p><p className="font-semibold">{formatCurrency(l.loan.amount)}</p></div>
                  <div><p className="text-gray-500 dark:text-gray-400 text-xs">Total Collected</p><p className="font-semibold text-green-600">{formatCurrency(l.loan.totalPaid)}</p></div>
                  <div><p className="text-gray-500 dark:text-gray-400 text-xs">Balance</p><p className="font-semibold text-red-600">{formatCurrency(l.loan.pendingAmount)}</p></div>
                </div>

                <Button size="sm" onClick={() => openAddCollect(l.loan)}>+ Record Collection</Button>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                        <th className="py-1.5 pr-2">Date</th><th className="py-1.5 pr-2">Status</th><th className="py-1.5 pr-2 text-right">Amount</th><th className="py-1.5">Collected By</th><th className="py-1.5"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {l.payments.map((p) => (
                        <tr key={p.id} className="border-b border-gray-50 dark:border-gray-700/50">
                          <td className="py-1.5 pr-2">{formatDate(p.date)}</td>
                          <td className="py-1.5 pr-2"><Badge>{p.type}</Badge></td>
                          <td className="py-1.5 pr-2 text-right font-medium">{formatCurrency(p.amount)}</td>
                          <td className="py-1.5">{p.collectedBy}</td>
                          <td className="py-1.5 text-right whitespace-nowrap">
                            <button onClick={() => openEditCollect(l.loan.id, p)} className="text-gray-400 hover:text-blue-600 p-1"><Pencil size={13} /></button>
                            <button onClick={() => setDeleteTarget({ kind: 'payment', id: p.id, label: `this collection (${formatCurrency(p.amount)})` })} className="text-gray-400 hover:text-red-600 p-1"><Trash2 size={13} /></button>
                          </td>
                        </tr>
                      ))}
                      {l.payments.length === 0 && <tr><td colSpan={5} className="py-3 text-center text-gray-400">No collections recorded yet.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
        {loans.length === 0 && <p className="text-sm text-gray-400 text-center py-10">No loans added yet.</p>}
      </div>

      <Dialog open={showAdd} onClose={() => setShowAdd(false)} title={editLoanId != null ? 'Edit Loan' : 'Add Loan (Money Given)'}
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

      <Dialog open={showCollect !== null} onClose={() => setShowCollect(null)} title={editPayment ? 'Edit Collection' : 'Record Collection'}
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

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete this?"
        message={deleteTarget ? `Remove ${deleteTarget.label}? This can't be undone.` : ''}
        confirmLabel="Delete"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
