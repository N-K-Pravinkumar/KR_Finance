import React, { useEffect, useState } from 'react'
import { Plus, ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react'
import { Card, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Dialog, ConfirmDialog } from '../../components/ui/Dialog'
import { formatCurrency, formatDate } from '../../utils/format'
import { useAuth } from '../../context/AuthContext'
import {
  addBorrowing, addBorrowingRepayment, deleteBorrowing, deleteBorrowingRepayment,
  listBorrowings, updateBorrowing, updateBorrowingRepayment
} from '../api/naveenApi'
import { BorrowingSummary, NaveenBorrowing, NaveenBorrowingRepayment } from '../types'
import { NaveenTotals } from '../NaveenTotals'
import { NaveenLoading } from '../NaveenLoading'

const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100'
const today = () => new Date().toISOString().slice(0, 10)

type DeleteTarget = { kind: 'borrowing' | 'repayment'; id: number; label: string }

export default function Borrowed() {
  const { user } = useAuth()
  const [borrowings, setBorrowings] = useState<BorrowingSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const [showAdd, setShowAdd] = useState(false)
  const [editBorrowingId, setEditBorrowingId] = useState<number | null>(null)
  const [form, setForm] = useState({ lenderName: '', mobile: '', amount: '', date: today(), interestPercent: '', notes: '' })

  const [showRepay, setShowRepay] = useState<number | null>(null)
  const [editRepayment, setEditRepayment] = useState<NaveenBorrowingRepayment | null>(null)
  const [repayForm, setRepayForm] = useState({ date: today(), amount: '', notes: '' })

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)

  const load = () => {
    setLoading(true)
    listBorrowings().then(setBorrowings).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const totals = borrowings.reduce((acc, b) => ({
    amount: acc.amount + b.totalPayable,
    paid: acc.paid + b.totalRepaid,
    pending: acc.pending + b.balance
  }), { amount: 0, paid: 0, pending: 0 })

  const openAdd = () => {
    setEditBorrowingId(null)
    setForm({ lenderName: '', mobile: '', amount: '', date: today(), interestPercent: '', notes: '' })
    setShowAdd(true)
  }
  const openEdit = (b: NaveenBorrowing) => {
    setEditBorrowingId(b.id)
    setForm({ lenderName: b.lenderName, mobile: b.mobile || '', amount: String(b.amount ?? ''), date: b.date, interestPercent: b.interestPercent ? String(b.interestPercent) : '', notes: b.notes || '' })
    setShowAdd(true)
  }

  const submitBorrowing = async () => {
    const amount = parseFloat(form.amount)
    if (!form.lenderName.trim() || isNaN(amount)) return
    setSaving(true)
    try {
      const payload = {
        lenderName: form.lenderName, mobile: form.mobile, amount, date: form.date,
        interestPercent: form.interestPercent ? parseFloat(form.interestPercent) : undefined, notes: form.notes
      }
      if (editBorrowingId != null) await updateBorrowing(editBorrowingId, payload)
      else await addBorrowing(payload)
      setShowAdd(false)
      load()
    } finally {
      setSaving(false)
    }
  }

  const openAddRepay = (id: number) => {
    setEditRepayment(null)
    setRepayForm({ date: today(), amount: '', notes: '' })
    setShowRepay(id)
  }
  const openEditRepay = (borrowingId: number, r: NaveenBorrowingRepayment) => {
    setEditRepayment(r)
    setRepayForm({ date: r.date, amount: String(r.amount ?? ''), notes: r.notes || '' })
    setShowRepay(borrowingId)
  }

  const submitRepayment = async (id: number) => {
    const amount = parseFloat(repayForm.amount)
    if (isNaN(amount) || amount <= 0) return
    setSaving(true)
    try {
      if (editRepayment) {
        await updateBorrowingRepayment(editRepayment.id, { date: repayForm.date, amount, notes: repayForm.notes })
      } else {
        await addBorrowingRepayment(id, { date: repayForm.date, amount, notes: repayForm.notes }, user?.name || 'system')
      }
      setShowRepay(null)
      load()
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    if (deleteTarget.kind === 'borrowing') await deleteBorrowing(deleteTarget.id)
    else await deleteBorrowingRepayment(deleteTarget.id)
    setDeleteTarget(null)
    load()
  }

  if (loading) return <NaveenLoading label="Loading borrowings..." />

  return (
    <div className="space-y-4 py-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Money Borrowed</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Money you've borrowed and need to repay</p>
        </div>
        <Button size="sm" onClick={openAdd}><Plus size={16} /> Add Borrowing</Button>
      </div>

      <NaveenTotals totalAmount={totals.amount} totalPaid={totals.paid} totalPending={totals.pending} amountLabel="Total Payable" />

      <div className="space-y-3">
        {borrowings.map((b) => (
          <Card key={b.borrowing.id}>
            <div className="w-full flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 gap-2">
              <button className="flex-1 text-left min-w-0" onClick={() => setExpanded(expanded === b.borrowing.id ? null : b.borrowing.id)}>
                <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{b.borrowing.lenderName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Borrowed {formatCurrency(b.borrowing.amount)} on {formatDate(b.borrowing.date)}</p>
              </button>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Balance</p>
                  <p className={`font-bold ${b.balance > 0.5 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(b.balance)}</p>
                </div>
                <button onClick={() => openEdit(b.borrowing)} className="text-gray-400 hover:text-blue-600 p-1"><Pencil size={15} /></button>
                <button onClick={() => setDeleteTarget({ kind: 'borrowing', id: b.borrowing.id, label: `borrowing from "${b.borrowing.lenderName}" and all repayments` })} className="text-gray-400 hover:text-red-600 p-1"><Trash2 size={15} /></button>
                <button onClick={() => setExpanded(expanded === b.borrowing.id ? null : b.borrowing.id)} className="text-gray-400 p-1">
                  {expanded === b.borrowing.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
              </div>
            </div>

            {expanded === b.borrowing.id && (
              <CardContent className="border-t border-gray-100 dark:border-gray-700 space-y-4">
                <div className="grid grid-cols-3 gap-3 text-center text-sm">
                  <div><p className="text-gray-500 dark:text-gray-400 text-xs">Total Payable</p><p className="font-semibold">{formatCurrency(b.totalPayable)}</p></div>
                  <div><p className="text-gray-500 dark:text-gray-400 text-xs">Total Repaid</p><p className="font-semibold text-green-600">{formatCurrency(b.totalRepaid)}</p></div>
                  <div><p className="text-gray-500 dark:text-gray-400 text-xs">Balance</p><p className="font-semibold text-red-600">{formatCurrency(b.balance)}</p></div>
                </div>

                <Button size="sm" variant="success" onClick={() => openAddRepay(b.borrowing.id)}>+ Repayment</Button>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                        <th className="py-1.5 pr-2">Date</th><th className="py-1.5 pr-2">Transaction</th><th className="py-1.5 text-right">Amount</th><th className="py-1.5"></th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-50 dark:border-gray-700/50">
                        <td className="py-1.5 pr-2">{formatDate(b.borrowing.date)}</td>
                        <td className="py-1.5 pr-2">Amount Borrowed</td>
                        <td className="py-1.5 text-right font-medium">+{formatCurrency(b.borrowing.amount)}</td>
                        <td></td>
                      </tr>
                      {b.repayments.map((r) => (
                        <tr key={r.id} className="border-b border-gray-50 dark:border-gray-700/50 bg-green-50/50 dark:bg-green-900/10">
                          <td className="py-1.5 pr-2">{formatDate(r.date)}</td>
                          <td className="py-1.5 pr-2 text-green-700 dark:text-green-400">Repayment {r.notes ? `— ${r.notes}` : ''}</td>
                          <td className="py-1.5 text-right font-medium text-green-700 dark:text-green-400">-{formatCurrency(r.amount)}</td>
                          <td className="py-1.5 text-right whitespace-nowrap">
                            <button onClick={() => openEditRepay(b.borrowing.id, r)} className="text-gray-400 hover:text-blue-600 p-1"><Pencil size={13} /></button>
                            <button onClick={() => setDeleteTarget({ kind: 'repayment', id: r.id, label: `this repayment (${formatCurrency(r.amount)})` })} className="text-gray-400 hover:text-red-600 p-1"><Trash2 size={13} /></button>
                          </td>
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

      <Dialog open={showAdd} onClose={() => setShowAdd(false)} title={editBorrowingId != null ? 'Edit Borrowing' : 'Add Borrowing'}
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

      <Dialog open={showRepay !== null} onClose={() => setShowRepay(null)} title={editRepayment ? 'Edit Repayment' : 'Record Repayment'}
        footer={<><Button variant="secondary" onClick={() => setShowRepay(null)}>Cancel</Button><Button variant="success" onClick={() => showRepay && submitRepayment(showRepay)} disabled={saving}>Save</Button></>}>
        <div className="space-y-3">
          <input type="date" className={inputCls} value={repayForm.date} onChange={(e) => setRepayForm({ ...repayForm, date: e.target.value })} />
          <input type="number" className={inputCls} placeholder="Amount" value={repayForm.amount} onChange={(e) => setRepayForm({ ...repayForm, amount: e.target.value })} />
          <input className={inputCls} placeholder="Notes (optional)" value={repayForm.notes} onChange={(e) => setRepayForm({ ...repayForm, notes: e.target.value })} />
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
