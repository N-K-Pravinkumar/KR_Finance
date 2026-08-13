import React, { useEffect, useState } from 'react'
import { Plus, ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { formatCurrency, formatDate } from '../../utils/format'
import { useAuth } from '../../context/AuthContext'
import { addSupplier, addSupplierPayment, addSupplierPurchase, listSuppliers } from '../api/naveenApi'
import { SupplierSummary } from '../types'
import { NaveenTabs } from '../NaveenTabs'

const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100'

export default function Suppliers() {
  const { user } = useAuth()
  const [suppliers, setSuppliers] = useState<SupplierSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [showAddSupplier, setShowAddSupplier] = useState(false)
  const [showPurchase, setShowPurchase] = useState<number | null>(null)
  const [showPayment, setShowPayment] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const [supplierForm, setSupplierForm] = useState({ name: '', mobile: '', address: '' })
  const [purchaseForm, setPurchaseForm] = useState({ date: new Date().toISOString().slice(0, 10), item: '', qty: '', rate: '', notes: '' })
  const [paymentForm, setPaymentForm] = useState({ date: new Date().toISOString().slice(0, 10), amount: '', notes: '' })

  const load = () => {
    setLoading(true)
    listSuppliers().then(setSuppliers).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const submitSupplier = async () => {
    if (!supplierForm.name.trim()) return
    setSaving(true)
    try {
      await addSupplier(supplierForm)
      setShowAddSupplier(false)
      setSupplierForm({ name: '', mobile: '', address: '' })
      load()
    } finally {
      setSaving(false)
    }
  }

  const submitPurchase = async (supplierId: number) => {
    const qty = parseFloat(purchaseForm.qty)
    const rate = parseFloat(purchaseForm.rate)
    if (!purchaseForm.item.trim() || isNaN(qty) || isNaN(rate)) return
    setSaving(true)
    try {
      await addSupplierPurchase(supplierId, { date: purchaseForm.date, item: purchaseForm.item, qty, rate, notes: purchaseForm.notes }, user?.name || 'system')
      setShowPurchase(null)
      setPurchaseForm({ date: new Date().toISOString().slice(0, 10), item: '', qty: '', rate: '', notes: '' })
      load()
    } finally {
      setSaving(false)
    }
  }

  const submitPayment = async (supplierId: number) => {
    const amount = parseFloat(paymentForm.amount)
    if (isNaN(amount) || amount <= 0) return
    setSaving(true)
    try {
      await addSupplierPayment(supplierId, { date: paymentForm.date, amount, notes: paymentForm.notes }, user?.name || 'system')
      setShowPayment(null)
      setPaymentForm({ date: new Date().toISOString().slice(0, 10), amount: '', notes: '' })
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
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Suppliers</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Vegetable purchases and part-payment settlements</p>
        </div>
        <Button size="sm" onClick={() => setShowAddSupplier(true)}><Plus size={16} /> Add Supplier</Button>
      </div>

      <div className="space-y-3">
        {suppliers.map((s) => (
          <Card key={s.supplier.id}>
            <button
              className="w-full flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 text-left"
              onClick={() => setExpanded(expanded === s.supplier.id ? null : s.supplier.id)}
            >
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{s.supplier.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{s.supplier.mobile}</p>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Balance</p>
                  <p className={`font-bold ${s.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(s.balance)}</p>
                </div>
                {expanded === s.supplier.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>
            </button>

            {expanded === s.supplier.id && (
              <CardContent className="border-t border-gray-100 dark:border-gray-700 space-y-4">
                <div className="grid grid-cols-3 gap-3 text-center text-sm">
                  <div><p className="text-gray-500 dark:text-gray-400 text-xs">Total Purchases</p><p className="font-semibold">{formatCurrency(s.totalPurchases)}</p></div>
                  <div><p className="text-gray-500 dark:text-gray-400 text-xs">Total Paid</p><p className="font-semibold text-green-600">{formatCurrency(s.totalPaid)}</p></div>
                  <div><p className="text-gray-500 dark:text-gray-400 text-xs">Balance</p><p className="font-semibold text-red-600">{formatCurrency(s.balance)}</p></div>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setShowPurchase(s.supplier.id)}>+ Purchase</Button>
                  <Button size="sm" variant="success" onClick={() => setShowPayment(s.supplier.id)}>+ Payment</Button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                        <th className="py-1.5 pr-2">Date</th><th className="py-1.5 pr-2">Item</th><th className="py-1.5 pr-2 text-right">Qty</th>
                        <th className="py-1.5 pr-2 text-right">Rate</th><th className="py-1.5 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.purchases.map((p) => (
                        <tr key={p.id} className="border-b border-gray-50 dark:border-gray-700/50">
                          <td className="py-1.5 pr-2">{formatDate(p.date)}</td>
                          <td className="py-1.5 pr-2">{p.item}</td>
                          <td className="py-1.5 pr-2 text-right">{p.qty}</td>
                          <td className="py-1.5 pr-2 text-right">{p.rate}</td>
                          <td className="py-1.5 text-right font-medium">{formatCurrency(p.amount)}</td>
                        </tr>
                      ))}
                      {s.payments.map((pay) => (
                        <tr key={`pay-${pay.id}`} className="border-b border-gray-50 dark:border-gray-700/50 bg-green-50/50 dark:bg-green-900/10">
                          <td className="py-1.5 pr-2">{formatDate(pay.date)}</td>
                          <td className="py-1.5 pr-2 text-green-700 dark:text-green-400" colSpan={3}>Payment {pay.notes ? `— ${pay.notes}` : ''}</td>
                          <td className="py-1.5 text-right font-medium text-green-700 dark:text-green-400">-{formatCurrency(pay.amount)}</td>
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

      <Dialog open={showAddSupplier} onClose={() => setShowAddSupplier(false)} title="Add Supplier"
        footer={<><Button variant="secondary" onClick={() => setShowAddSupplier(false)}>Cancel</Button><Button onClick={submitSupplier} disabled={saving}>Save</Button></>}>
        <div className="space-y-3">
          <input className={inputCls} placeholder="Supplier Name" value={supplierForm.name} onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })} />
          <input className={inputCls} placeholder="Mobile" value={supplierForm.mobile} onChange={(e) => setSupplierForm({ ...supplierForm, mobile: e.target.value })} />
          <input className={inputCls} placeholder="Address" value={supplierForm.address} onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })} />
        </div>
      </Dialog>

      <Dialog open={showPurchase !== null} onClose={() => setShowPurchase(null)} title="Record Purchase"
        footer={<><Button variant="secondary" onClick={() => setShowPurchase(null)}>Cancel</Button><Button onClick={() => showPurchase && submitPurchase(showPurchase)} disabled={saving}>Save</Button></>}>
        <div className="space-y-3">
          <input type="date" className={inputCls} value={purchaseForm.date} onChange={(e) => setPurchaseForm({ ...purchaseForm, date: e.target.value })} />
          <input className={inputCls} placeholder="Item (e.g. Tomato)" value={purchaseForm.item} onChange={(e) => setPurchaseForm({ ...purchaseForm, item: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <input type="number" className={inputCls} placeholder="Qty (kg)" value={purchaseForm.qty} onChange={(e) => setPurchaseForm({ ...purchaseForm, qty: e.target.value })} />
            <input type="number" className={inputCls} placeholder="Rate / kg" value={purchaseForm.rate} onChange={(e) => setPurchaseForm({ ...purchaseForm, rate: e.target.value })} />
          </div>
          {purchaseForm.qty && purchaseForm.rate && (
            <p className="text-sm text-gray-500 dark:text-gray-400">Total: {formatCurrency(parseFloat(purchaseForm.qty) * parseFloat(purchaseForm.rate))}</p>
          )}
          <input className={inputCls} placeholder="Notes (optional)" value={purchaseForm.notes} onChange={(e) => setPurchaseForm({ ...purchaseForm, notes: e.target.value })} />
        </div>
      </Dialog>

      <Dialog open={showPayment !== null} onClose={() => setShowPayment(null)} title="Record Payment"
        footer={<><Button variant="secondary" onClick={() => setShowPayment(null)}>Cancel</Button><Button variant="success" onClick={() => showPayment && submitPayment(showPayment)} disabled={saving}>Save</Button></>}>
        <div className="space-y-3">
          <input type="date" className={inputCls} value={paymentForm.date} onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })} />
          <input type="number" className={inputCls} placeholder="Amount" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} />
          <input className={inputCls} placeholder="Notes (optional)" value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} />
        </div>
      </Dialog>
    </div>
  )
}
