import React, { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Download, X } from 'lucide-react'
import { Card, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Dialog, ConfirmDialog } from '../../components/ui/Dialog'
import { formatCurrency, formatDate } from '../../utils/format'
import { useAuth } from '../../context/AuthContext'
import { BillItemInput, createBill, deleteBill, downloadBillPdf, listBills, listSuppliers, updateBill } from '../api/naveenApi'
import { BillDetail, NaveenSupplier } from '../types'
import { NaveenLoading } from '../NaveenLoading'

const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100'
const today = () => new Date().toISOString().slice(0, 10)

interface ItemRow { item: string; qty: string; rate: string }
const emptyRow = (): ItemRow => ({ item: '', qty: '', rate: '' })

export default function Billing() {
  const { user } = useAuth()
  const [bills, setBills] = useState<BillDetail[]>([])
  const [suppliers, setSuppliers] = useState<NaveenSupplier[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [supplierId, setSupplierId] = useState<string>('')
  const [customerName, setCustomerName] = useState('')
  const [date, setDate] = useState(today())
  const [rows, setRows] = useState<ItemRow[]>([emptyRow()])

  const [deleteId, setDeleteId] = useState<number | null>(null)

  const load = () => {
    setLoading(true)
    Promise.all([listBills(), listSuppliers()])
      .then(([b, s]) => { setBills(b); setSuppliers(s.map((x) => x.supplier)) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const rowTotal = (r: ItemRow) => (parseFloat(r.qty) || 0) * (parseFloat(r.rate) || 0)
  const grandTotal = rows.reduce((sum, r) => sum + rowTotal(r), 0)

  const openAdd = () => {
    setEditId(null)
    setSupplierId('')
    setCustomerName('')
    setDate(today())
    setRows([emptyRow()])
    setShowForm(true)
  }

  const openEdit = (b: BillDetail) => {
    setEditId(b.bill.id)
    setSupplierId(b.bill.supplierId ? String(b.bill.supplierId) : '')
    setCustomerName(b.bill.customerName || '')
    setDate(b.bill.date)
    setRows(b.items.length > 0 ? b.items.map((i) => ({ item: i.item, qty: String(i.qty), rate: String(i.rate) })) : [emptyRow()])
    setShowForm(true)
  }

  const updateRow = (idx: number, patch: Partial<ItemRow>) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  }
  const addRow = () => setRows((prev) => [...prev, emptyRow()])
  const removeRow = (idx: number) => setRows((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev))

  const submit = async () => {
    const items: BillItemInput[] = rows
      .filter((r) => r.item.trim() && parseFloat(r.qty) > 0)
      .map((r) => ({ item: r.item.trim(), qty: parseFloat(r.qty) || 0, rate: parseFloat(r.rate) || 0 }))
    if (items.length === 0) return
    setSaving(true)
    try {
      const payload = { supplierId: supplierId ? Number(supplierId) : null, customerName: customerName || undefined, date, items }
      if (editId != null) await updateBill(editId, payload, user?.name || 'system')
      else await createBill(payload, user?.name || 'system')
      setShowForm(false)
      load()
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (deleteId == null) return
    await deleteBill(deleteId)
    setDeleteId(null)
    load()
  }

  const handleDownload = async (id: number) => {
    setDownloadingId(id)
    try {
      const res = await downloadBillPdf(id)
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `bill-${id}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloadingId(null)
    }
  }

  if (loading) return <NaveenLoading label="Loading bills..." />

  return (
    <div className="space-y-4 py-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Billing</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Itemized invoices — SRM Naveen Vegetables, downloadable as PDF</p>
        </div>
        <Button size="sm" onClick={openAdd}><Plus size={16} /> New Bill</Button>
      </div>

      <div className="space-y-3">
        {bills.map((b) => (
          <Card key={b.bill.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  INV-{String(b.bill.id).padStart(4, '0')} {b.supplierName ? `— ${b.supplierName}` : b.bill.customerName ? `— ${b.bill.customerName}` : ''}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(b.bill.date)} · {b.items.length} item(s)</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <p className="font-bold text-gray-900 dark:text-gray-100">{formatCurrency(b.bill.totalAmount)}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3">
              <Button size="sm" variant="secondary" disabled={downloadingId === b.bill.id} onClick={() => handleDownload(b.bill.id)}>
                <Download size={14} /> {downloadingId === b.bill.id ? 'Downloading...' : 'PDF'}
              </Button>
              <button onClick={() => openEdit(b)} className="text-gray-400 hover:text-blue-600 p-2"><Pencil size={15} /></button>
              <button onClick={() => setDeleteId(b.bill.id)} className="text-gray-400 hover:text-red-600 p-2"><Trash2 size={15} /></button>
            </div>
          </Card>
        ))}
        {bills.length === 0 && <p className="text-sm text-gray-400 text-center py-10">No bills created yet.</p>}
      </div>

      <Dialog open={showForm} onClose={() => setShowForm(false)} title={editId != null ? 'Edit Bill' : 'New Bill'}
        footer={<><Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button><Button onClick={submit} disabled={saving}>Save Bill</Button></>}>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Supplier (optional — logs the total to their balance)</label>
            <select className={inputCls} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">None</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <input className={inputCls} placeholder="Customer Name (optional)" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />

          <div className="space-y-2">
            <label className="text-xs text-gray-500 dark:text-gray-400 block">Items</label>
            {rows.map((r, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <input className={inputCls} placeholder="Item" value={r.item} onChange={(e) => updateRow(idx, { item: e.target.value })} />
                <input type="number" className={`${inputCls} w-20`} placeholder="Qty" value={r.qty} onChange={(e) => updateRow(idx, { qty: e.target.value })} />
                <input type="number" className={`${inputCls} w-24`} placeholder="Rate" value={r.rate} onChange={(e) => updateRow(idx, { rate: e.target.value })} />
                <span className="text-xs w-16 text-right shrink-0">{formatCurrency(rowTotal(r))}</span>
                <button onClick={() => removeRow(idx)} className="text-gray-400 hover:text-red-600 p-1 shrink-0"><X size={14} /></button>
              </div>
            ))}
            <Button size="sm" variant="secondary" onClick={addRow}>+ Add Item</Button>
          </div>

          <div className="flex justify-between pt-2 border-t border-gray-100 dark:border-gray-700 font-semibold">
            <span>Total</span><span>{formatCurrency(grandTotal)}</span>
          </div>
        </div>
      </Dialog>

      <ConfirmDialog
        open={deleteId !== null}
        title="Delete this bill?"
        message="This removes the invoice and, if it was linked to a supplier, that purchase entry too. This can't be undone."
        confirmLabel="Delete"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
