import React, { useEffect, useState } from 'react'
import { useNavigate, useParams, Navigate } from 'react-router-dom'
import { api } from '../api/client'
import { Customer } from '../types'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { useAuth } from '../context/AuthContext'

// financeAmount / interest / totalInstallments are kept as strings while editing so the field
// can show truly empty while typing instead of snapping to "0" — they're parsed to numbers on submit.
const emptyForm = {
  name: '', mobile: '', alternateMobile: '', groupKey: '', address: '',
  financeAmount: '', interest: '10', startDate: new Date().toISOString().slice(0, 10),
  financeType: 'Daily' as 'Daily' | 'Weekly', collectionDay: '', totalInstallments: '100'
}

export default function CustomerForm() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const { user, isAdmin } = useAuth()
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isEdit) {
      api.get<Customer>(`/customers/${id}`).then((r) => {
        const c = r.data
        setForm({
          name: c.name, mobile: c.mobile, alternateMobile: c.alternateMobile || '', groupKey: c.groupKey || '',
          address: c.address, financeAmount: String(c.financeAmount ?? ''), interest: String(c.interest ?? ''),
          startDate: c.startDate?.slice(0, 10), financeType: c.financeType,
          collectionDay: c.collectionDay || '', totalInstallments: String(c.totalInstallments ?? '')
        })
      })
    }
  }, [id, isEdit])

  const handleChange = (field: string, value: any) => setForm((f) => ({ ...f, [field]: value }))

  if (!isAdmin) return <Navigate to="/customers" replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const financeAmount = parseFloat(form.financeAmount) || 0
      const interest = parseFloat(form.interest) || 0
      const totalInstallments = parseInt(form.totalInstallments, 10) || 100
      const installmentAmount = Math.round(((financeAmount * (1 + interest / 100)) / totalInstallments) * 100) / 100
      const payload = { ...form, financeAmount, interest, totalInstallments, installmentAmount }
      if (isEdit) {
        await api.put(`/customers/${id}`, payload, { params: { editedBy: user?.name, reason: 'Profile update' } })
      } else {
        await api.post('/customers', payload)
      }
      navigate('/customers')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 py-2 max-w-2xl">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{isEdit ? 'Edit Customer' : 'Add Customer'}</h1>
      <Card>
        <CardHeader><CardTitle>Customer Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Full Name" value={form.name} onChange={(v) => handleChange('name', v)} required />
              <Field label="Mobile Number" value={form.mobile} onChange={(v) => handleChange('mobile', v)} required />
              <Field label="Alternate Mobile" value={form.alternateMobile} onChange={(v) => handleChange('alternateMobile', v)} />
              <Field label="Start Date" type="date" value={form.startDate} onChange={(v) => handleChange('startDate', v)} required />
              <div className="sm:col-span-2">
                <Field
                  label="Person / Group Key (optional — link multiple loans to the same person)"
                  value={form.groupKey}
                  onChange={(v) => handleChange('groupKey', v)}
                />
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Leave blank to auto-group by name. If this person already has another loan, use the exact same value here as on their other loan (e.g. their name or a shared ID) so both show up under "Other Loans".
                </p>
              </div>
            </div>
            <Field label="Address" value={form.address} onChange={(v) => handleChange('address', v)} textarea />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Finance Amount (Rs.)" type="number" value={form.financeAmount} onChange={(v) => handleChange('financeAmount', v)} required />
              <Field label="Interest (%)" type="number" value={form.interest} onChange={(v) => handleChange('interest', v)} required />
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Finance Type</label>
                <select
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2.5 text-sm"
                  value={form.financeType}
                  onChange={(e) => handleChange('financeType', e.target.value)}
                >
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                </select>
              </div>
              {form.financeType === 'Weekly' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Collection Day</label>
                  <select
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2.5 text-sm"
                    value={form.collectionDay}
                    onChange={(e) => handleChange('collectionDay', e.target.value)}
                  >
                    <option value="">Select day</option>
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              )}
              <Field label="Total Installments" type="number" value={form.totalInstallments} onChange={(v) => handleChange('totalInstallments', v)} required />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => navigate(-1)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Customer'}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function Field({
  label, value, onChange, type = 'text', required = false, textarea = false
}: {
  label: string; value: any; onChange: (v: string) => void; type?: string; required?: boolean; textarea?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      {textarea ? (
        <textarea
          className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          rows={2}
        />
      ) : (
        <input
          type={type}
          className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
        />
      )}
    </div>
  )
}
