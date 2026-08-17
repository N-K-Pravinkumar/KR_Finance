import React, { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Card, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Dialog, ConfirmDialog } from '../../components/ui/Dialog'
import { formatCurrency, formatDate } from '../../utils/format'
import { useAuth } from '../../context/AuthContext'
import { addExpense, deleteExpense, listExpenses, updateExpense } from '../api/naveenApi'
import { NaveenCashEntry } from '../types'
import { NaveenLoading } from '../NaveenLoading'

const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100'
const today = () => new Date().toISOString().slice(0, 10)

/** Simple daily spending notes — replaces the old full Cash Ledger with a plain expense list. */
export default function Expenses() {
  const { user } = useAuth()
  const [entries, setEntries] = useState<NaveenCashEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const [form, setForm] = useState({ date: today(), category: '', amount: '', notes: '' })

  const load = () => {
    setLoading(true)
    listExpenses().then(setEntries).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const totalSpent = entries.filter((e) => e.direction !== 'IN').reduce((sum, e) => sum + (e.amount || 0), 0)

  const openAdd = () => {
    setEditId(null)
    setForm({ date: today(), category: '', amount: '', notes: '' })
    setShowAdd(true)
  }
  const openEdit = (e: NaveenCashEntry) => {
    setEditId(e.id)
    setForm({ date: e.date, category: e.category || '', amount: String(e.amount ?? ''), notes: e.notes || '' })
    setShowAdd(true)
  }

  const submit = async () => {
    const amount = parseFloat(form.amount)
    if (isNaN(amount) || amount <= 0 || !form.category.trim()) return
    setSaving(true)
    try {
      const payload = { date: form.date, direction: 'OUT' as const, category: form.category, amount, notes: form.notes }
      if (editId != null) await updateExpense(editId, payload)
      else await addExpense(payload, user?.name || 'system')
      setShowAdd(false)
      load()
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (deleteId == null) return
    await deleteExpense(deleteId)
    setDeleteId(null)
    load()
  }

  if (loading) return <NaveenLoading label="Loading expenses..." />

  return (
    <div className="space-y-4 py-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Expenses</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Daily spending notes — petrol, food, transport, anything else you spend</p>
        </div>
        <Button size="sm" onClick={openAdd}><Plus size={16} /> Add Expense</Button>
      </div>

      <Card className="p-4">
        <p className="text-xs text-gray-500 dark:text-gray-400">Total Spent</p>
        <p className="text-xl font-bold text-red-600 mt-1">{formatCurrency(totalSpent)}</p>
      </Card>

      <Card>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                  <th className="py-1.5 pr-2">Date</th><th className="py-1.5 pr-2">Note</th><th className="py-1.5 pr-2">Details</th>
                  <th className="py-1.5 pr-2 text-right">Amount</th><th className="py-1.5"></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b border-gray-50 dark:border-gray-700/50">
                    <td className="py-1.5 pr-2 whitespace-nowrap">{formatDate(e.date)}</td>
                    <td className="py-1.5 pr-2 font-medium">{e.category}</td>
                    <td className="py-1.5 pr-2 text-gray-500 dark:text-gray-400">{e.notes}</td>
                    <td className="py-1.5 pr-2 text-right font-medium text-red-600">{formatCurrency(e.amount)}</td>
                    <td className="py-1.5 text-right whitespace-nowrap">
                      <button onClick={() => openEdit(e)} className="text-gray-400 hover:text-blue-600 p-1"><Pencil size={14} /></button>
                      <button onClick={() => setDeleteId(e.id)} className="text-gray-400 hover:text-red-600 p-1"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
                {entries.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-gray-400">No expenses logged yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showAdd} onClose={() => setShowAdd(false)} title={editId != null ? 'Edit Expense' : 'Add Expense'}
        footer={<><Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button><Button onClick={submit} disabled={saving}>Save</Button></>}>
        <div className="space-y-3">
          <input type="date" className={inputCls} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <input className={inputCls} placeholder="What was it for? (e.g. Petrol, Food, Transport)" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <input type="number" className={inputCls} placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <input className={inputCls} placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
      </Dialog>

      <ConfirmDialog
        open={deleteId !== null}
        title="Delete this expense?"
        message="This can't be undone."
        confirmLabel="Delete"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
