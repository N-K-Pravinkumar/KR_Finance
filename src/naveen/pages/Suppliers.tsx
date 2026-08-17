import React, { useEffect, useState } from 'react'
import { Plus, ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react'
import { Card, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Dialog, ConfirmDialog } from '../../components/ui/Dialog'
import { formatCurrency, formatDate } from '../../utils/format'
import { useAuth } from '../../context/AuthContext'
import {
  addSupplier, addSupplierPayment, addSupplierPurchase, deleteSupplier, deleteSupplierPayment,
  deleteSupplierPurchase, listSuppliers, updateSupplier, updateSupplierPayment, updateSupplierPurchase
} from '../api/naveenApi'
import { NaveenSupplier, NaveenSupplierPayment, NaveenSupplierPurchase, SupplierSummary } from '../types'
import { NaveenTotals } from '../NaveenTotals'
import { NaveenLoading } from '../NaveenLoading'

const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100'
const today = () => new Date().toISOString().slice(0, 10)

type DeleteTarget = { kind: 'supplier' | 'purchase' | 'payment'; id: number; label: string }

export default function Suppliers() {
  const { user } = useAuth()
  const [suppliers, setSuppliers] = useState<SupplierSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const [showAddSupplier, setShowAddSupplier] = useState(false)
  const [editSupplierId, setEditSupplierId] = useState<number | null>(null)
  const [supplierForm, setSupplierForm] = useState({ name: '', mobile: '', address: '' })

  const [showPurchase, setShowPurchase] = useState<number | null>(null)
  const [editPurchase, setEditPurchase] = useState<NaveenSupplierPurchase | null>(null)
  const [purchaseForm, setPurchaseForm] = useState({ date: today(), amount: '', notes: '' })

  const [showPayment, setShowPayment] = useState<number | null>(null)
  const [editPayment, setEditPayment] = useState<NaveenSupplierPayment | null>(null)
  const [paymentForm, setPaymentForm] = useState({ date: today(), amount: '', notes: '' })

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)

  const load = () => {
    setLoading(true)
    listSuppliers().then(setSuppliers).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const totals = suppliers.reduce((acc, s) => ({
    amount: acc.amount + s.totalPurchases,
    paid: acc.paid + s.totalPaid,
    pending: acc.pending + s.balance
  }), { amount: 0, paid: 0, pending: 0 })

  // ---- Supplier ----
  const openAddSupplier = () => {
    setEditSupplierId(null)
    setSupplierForm({ name: '', mobile: '', address: '' })
    setShowAddSupplier(true)
  }
  const openEditSupplier = (s: NaveenSupplier) => {
    setEditSupplierId(s.id)
    setSupplierForm({ name: s.name, mobile: s.mobile || '', address: s.address || '' })
    setShowAddSupplier(true)
  }
  const submitSupplier = async () => {
    if (!supplierForm.name.trim()) return
    setSaving(true)
    try {
      if (editSupplierId != null) await updateSupplier(editSupplierId, supplierForm)
      else await addSupplier(supplierForm)
      setShowAddSupplier(false)
      load()
    } finally {
      setSaving(false)
    }
  }

  // ---- Purchase ----
  const openAddPurchase = (supplierId: number) => {
    setEditPurchase(null)
    setPurchaseForm({ date: today(), amount: '', notes: '' })
    setShowPurchase(supplierId)
  }
  const openEditPurchase = (supplierId: number, p: NaveenSupplierPurchase) => {
    setEditPurchase(p)
    setPurchaseForm({ date: p.date, amount: String(p.amount ?? ''), notes: p.notes || '' })
    setShowPurchase(supplierId)
  }
  const submitPurchase = async (supplierId: number) => {
    const amount = parseFloat(purchaseForm.amount)
    if (isNaN(amount) || amount <= 0) return
    setSaving(true)
    try {
      if (editPurchase) {
        await updateSupplierPurchase(editPurchase.id, { date: purchaseForm.date, amount, notes: purchaseForm.notes })
      } else {
        await addSupplierPurchase(supplierId, { date: purchaseForm.date, amount, notes: purchaseForm.notes }, user?.name || 'system')
      }
      setShowPurchase(null)
      load()
    } finally {
      setSaving(false)
    }
  }

  // ---- Payment ----
  const openAddPayment = (supplierId: number) => {
    setEditPayment(null)
    setPaymentForm({ date: today(), amount: '', notes: '' })
    setShowPayment(supplierId)
  }
  const openEditPayment = (supplierId: number, p: NaveenSupplierPayment) => {
    setEditPayment(p)
    setPaymentForm({ date: p.date, amount: String(p.amount ?? ''), notes: p.notes || '' })
    setShowPayment(supplierId)
  }
  const submitPayment = async (supplierId: number) => {
    const amount = parseFloat(paymentForm.amount)
    if (isNaN(amount) || amount <= 0) return
    setSaving(true)
    try {
      if (editPayment) {
        await updateSupplierPayment(editPayment.id, { date: paymentForm.date, amount, notes: paymentForm.notes })
      } else {
        await addSupplierPayment(supplierId, { date: paymentForm.date, amount, notes: paymentForm.notes }, user?.name || 'system')
      }
      setShowPayment(null)
      load()
    } finally {
      setSaving(false)
    }
  }

  // ---- Delete (with confirm) ----
  const confirmDelete = async () => {
    if (!deleteTarget) return
    if (deleteTarget.kind === 'supplier') await deleteSupplier(deleteTarget.id)
    else if (deleteTarget.kind === 'purchase') await deleteSupplierPurchase(deleteTarget.id)
    else await deleteSupplierPayment(deleteTarget.id)
    setDeleteTarget(null)
    load()
  }

  if (loading) return <NaveenLoading label="Loading suppliers..." />

  return (
    <div className="space-y-4 py-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Suppliers</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Vegetable purchases and part-payment settlements</p>
        </div>
        <Button size="sm" onClick={openAddSupplier}><Plus size={16} /> Add Supplier</Button>
      </div>

      <NaveenTotals totalAmount={totals.amount} totalPaid={totals.paid} totalPending={totals.pending} amountLabel="Total Purchases" />

      <div className="space-y-3">
        {suppliers.map((s) => (
          <Card key={s.supplier.id}>
            <div className="w-full flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 gap-2">
              <button className="flex-1 text-left min-w-0" onClick={() => setExpanded(expanded === s.supplier.id ? null : s.supplier.id)}>
                <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{s.supplier.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{s.supplier.mobile}</p>
              </button>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Balance</p>
                  <p className={`font-bold ${s.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(s.balance)}</p>
                </div>
                <button onClick={() => openEditSupplier(s.supplier)} className="text-gray-400 hover:text-blue-600 p-1"><Pencil size={15} /></button>
                <button onClick={() => setDeleteTarget({ kind: 'supplier', id: s.supplier.id, label: `supplier "${s.supplier.name}" and all their purchases/payments` })} className="text-gray-400 hover:text-red-600 p-1"><Trash2 size={15} /></button>
                <button onClick={() => setExpanded(expanded === s.supplier.id ? null : s.supplier.id)} className="text-gray-400 p-1">
                  {expanded === s.supplier.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
              </div>
            </div>

            {expanded === s.supplier.id && (
              <CardContent className="border-t border-gray-100 dark:border-gray-700 space-y-4">
                <div className="grid grid-cols-3 gap-3 text-center text-sm">
                  <div><p className="text-gray-500 dark:text-gray-400 text-xs">Total Purchases</p><p className="font-semibold">{formatCurrency(s.totalPurchases)}</p></div>
                  <div><p className="text-gray-500 dark:text-gray-400 text-xs">Total Paid</p><p className="font-semibold text-green-600">{formatCurrency(s.totalPaid)}</p></div>
                  <div><p className="text-gray-500 dark:text-gray-400 text-xs">Balance</p><p className="font-semibold text-red-600">{formatCurrency(s.balance)}</p></div>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => openAddPurchase(s.supplier.id)}>+ Purchase</Button>
                  <Button size="sm" variant="success" onClick={() => openAddPayment(s.supplier.id)}>+ Payment</Button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                        <th className="py-1.5 pr-2">Date</th><th className="py-1.5 pr-2">Type</th><th className="py-1.5 pr-2">Notes</th>
                        <th className="py-1.5 text-right">Amount</th><th className="py-1.5"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.purchases.map((p) => (
                        <tr key={p.id} className="border-b border-gray-50 dark:border-gray-700/50">
                          <td className="py-1.5 pr-2">{formatDate(p.date)}</td>
                          <td className="py-1.5 pr-2">Purchase</td>
                          <td className="py-1.5 pr-2 text-gray-500 dark:text-gray-400">{p.notes}</td>
                          <td className="py-1.5 text-right font-medium">{formatCurrency(p.amount)}</td>
                          <td className="py-1.5 text-right whitespace-nowrap">
                            <button onClick={() => openEditPurchase(s.supplier.id, p)} className="text-gray-400 hover:text-blue-600 p-1"><Pencil size={13} /></button>
                            <button onClick={() => setDeleteTarget({ kind: 'purchase', id: p.id, label: `this purchase (${formatCurrency(p.amount)})` })} className="text-gray-400 hover:text-red-600 p-1"><Trash2 size={13} /></button>
                          </td>
                        </tr>
                      ))}
                      {s.payments.map((pay) => (
                        <tr key={`pay-${pay.id}`} className="border-b border-gray-50 dark:border-gray-700/50 bg-green-50/50 dark:bg-green-900/10">
                          <td className="py-1.5 pr-2">{formatDate(pay.date)}</td>
                          <td className="py-1.5 pr-2 text-green-700 dark:text-green-400">Payment</td>
                          <td className="py-1.5 pr-2 text-gray-500 dark:text-gray-400">{pay.notes}</td>
                          <td className="py-1.5 text-right font-medium text-green-700 dark:text-green-400">-{formatCurrency(pay.amount)}</td>
                          <td className="py-1.5 text-right whitespace-nowrap">
                            <button onClick={() => openEditPayment(s.supplier.id, pay)} className="text-gray-400 hover:text-blue-600 p-1"><Pencil size={13} /></button>
                            <button onClick={() => setDeleteTarget({ kind: 'payment', id: pay.id, label: `this payment (${formatCurrency(pay.amount)})` })} className="text-gray-400 hover:text-red-600 p-1"><Trash2 size={13} /></button>
                          </td>
                        </tr>
                      ))}
                      {s.purchases.length === 0 && s.payments.length === 0 && (
                        <tr><td colSpan={5} className="py-3 text-center text-gray-400">No transactions yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
        {suppliers.length === 0 && <p className="text-sm text-gray-400 text-center py-10">No suppliers added yet.</p>}
      </div>

      <Dialog open={showAddSupplier} onClose={() => setShowAddSupplier(false)} title={editSupplierId != null ? 'Edit Supplier' : 'Add Supplier'}
        footer={<><Button variant="secondary" onClick={() => setShowAddSupplier(false)}>Cancel</Button><Button onClick={submitSupplier} disabled={saving}>Save</Button></>}>
        <div className="space-y-3">
          <input className={inputCls} placeholder="Supplier Name" value={supplierForm.name} onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })} />
          <input className={inputCls} placeholder="Mobile" value={supplierForm.mobile} onChange={(e) => setSupplierForm({ ...supplierForm, mobile: e.target.value })} />
          <input className={inputCls} placeholder="Address" value={supplierForm.address} onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })} />
        </div>
      </Dialog>

      <Dialog open={showPurchase !== null} onClose={() => setShowPurchase(null)} title={editPurchase ? 'Edit Purchase' : 'Record Purchase'}
        footer={<><Button variant="secondary" onClick={() => setShowPurchase(null)}>Cancel</Button><Button onClick={() => showPurchase && submitPurchase(showPurchase)} disabled={saving}>Save</Button></>}>
        <div className="space-y-3">
          <input type="date" className={inputCls} value={purchaseForm.date} onChange={(e) => setPurchaseForm({ ...purchaseForm, date: e.target.value })} />
          <input type="number" className={inputCls} placeholder="Amount" value={purchaseForm.amount} onChange={(e) => setPurchaseForm({ ...purchaseForm, amount: e.target.value })} />
          <input className={inputCls} placeholder="Notes (optional)" value={purchaseForm.notes} onChange={(e) => setPurchaseForm({ ...purchaseForm, notes: e.target.value })} />
          <p className="text-xs text-gray-400 dark:text-gray-500">For an itemized bill (item / qty / rate), use the Billing tab instead — it also logs the total here automatically.</p>
        </div>
      </Dialog>

      <Dialog open={showPayment !== null} onClose={() => setShowPayment(null)} title={editPayment ? 'Edit Payment' : 'Record Payment'}
        footer={<><Button variant="secondary" onClick={() => setShowPayment(null)}>Cancel</Button><Button variant="success" onClick={() => showPayment && submitPayment(showPayment)} disabled={saving}>Save</Button></>}>
        <div className="space-y-3">
          <input type="date" className={inputCls} value={paymentForm.date} onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })} />
          <input type="number" className={inputCls} placeholder="Amount" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} />
          <input className={inputCls} placeholder="Notes (optional)" value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} />
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
