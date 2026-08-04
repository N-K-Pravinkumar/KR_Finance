import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Download, FileSpreadsheet, Filter, AlertTriangle } from 'lucide-react'
import { api } from '../api/client'
import { Customer } from '../types'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { formatCurrency, dueLabel, isOverdue } from '../utils/format'
import { useAuth } from '../context/AuthContext'

function statusColor(status: string) {
  if (status === 'Running') return 'blue'
  if (status === 'Completed') return 'green'
  return 'gray'
}

export default function Customers() {
  const { isAdmin } = useAuth()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [typeFilter, setTypeFilter] = useState('All')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('All')
  const [overdueOnly, setOverdueOnly] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350)
    return () => clearTimeout(t)
  }, [search])

  const buildParams = () => {
    const params: Record<string, string> = {}
    if (debouncedSearch) params.q = debouncedSearch
    if (statusFilter !== 'All') params.status = statusFilter
    if (typeFilter !== 'All') params.financeType = typeFilter
    if (paymentStatusFilter !== 'All') params.paymentStatus = paymentStatusFilter
    if (overdueOnly) params.overdue = 'true'
    return params
  }

  useEffect(() => {
    api.get('/customers', { params: buildParams() }).then((r) => setCustomers(r.data))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, statusFilter, typeFilter, paymentStatusFilter, overdueOnly])

  const filtered = customers

  const exportCsv = () => {
    const headers = ['Name', 'Mobile', 'Finance Type', 'Finance Amount', 'Total Paid', 'Pending', 'Status', 'Next Due']
    const rows = filtered.map((c) => [
      c.name, c.mobile, c.financeType, c.financeAmount, c.totalPaid, c.pendingAmount, c.status, c.nextDueDate
    ])
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'customers.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportExcel = async () => {
    const res = await api.get('/reports/excel/customers', {
      params: buildParams(),
      responseType: 'blob'
    })
    const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'customers.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4 py-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Customers</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{filtered.length} customers</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="secondary" size="sm" onClick={exportCsv}><Download size={14} /> CSV</Button>
          <Button variant="secondary" size="sm" onClick={exportExcel}><FileSpreadsheet size={14} /> Excel</Button>
          {isAdmin && (
            <Link to="/customers/new">
              <Button size="sm"><Plus size={14} /> Add Customer</Button>
            </Link>
          )}
        </div>
      </div>

      <Card className="p-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Search by name or mobile..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="secondary" size="sm" onClick={() => setShowFilters((v) => !v)}>
            <Filter size={14} /> Filters
          </Button>
        </div>
        {showFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            <select className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-2 py-2 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="All">All Status</option>
              <option value="Running">Running</option>
              <option value="Completed">Completed</option>
              <option value="Closed">Closed</option>
            </select>
            <select className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-2 py-2 text-sm" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="All">All Types</option>
              <option value="Daily">Daily</option>
              <option value="Weekly">Weekly</option>
            </select>
            <select className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-2 py-2 text-sm" value={paymentStatusFilter} onChange={(e) => setPaymentStatusFilter(e.target.value)}>
              <option value="All">Last Payment: Any</option>
              <option value="Paid">Last Payment: Paid</option>
              <option value="Partial">Last Payment: Partial</option>
              <option value="NotPaid">Last Payment: Not Paid</option>
              <option value="Advance">Last Payment: Advance</option>
            </select>
            <label className="flex items-center gap-2 text-sm px-2 text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} />
              Overdue only
            </label>
          </div>
        )}
      </Card>

      {/* Desktop table */}
      <Card className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">Type</th>
              <th className="text-right px-4 py-3">Financed</th>
              <th className="text-right px-4 py-3">Paid</th>
              <th className="text-right px-4 py-3">Pending</th>
              <th className="text-left px-4 py-3">Due</th>
              <th className="text-left px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer">
                <td className="px-4 py-3">
                  <Link to={`/customers/${c.id}`} className="font-medium text-blue-700 dark:text-blue-400 hover:underline">{c.name}</Link>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{c.mobile}</p>
                </td>
                <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{c.financeType}</td>
                <td className="px-4 py-3 text-right text-gray-900 dark:text-gray-100">{formatCurrency(c.financeAmount)}</td>
                <td className="px-4 py-3 text-right text-gray-900 dark:text-gray-100">{formatCurrency(c.totalPaid)}</td>
                <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-gray-100">{formatCurrency(c.pendingAmount)}</td>
                <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                  <div className="flex items-center gap-1">
                    {isOverdue(c.nextDueDate, c.status) && <AlertTriangle size={14} className="text-red-500" />}
                    {dueLabel(c.nextDueDate, c.financeType)}
                  </div>
                </td>
                <td className="px-4 py-3"><Badge color={statusColor(c.status)}>{c.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filtered.map((c) => (
          <Link to={`/customers/${c.id}`} key={c.id}>
            <Card className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{c.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{c.mobile}</p>
                </div>
                <Badge color={statusColor(c.status)}>{c.status}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400">
                <p>Type: <span className="text-gray-800 dark:text-gray-200 font-medium">{c.financeType}</span></p>
                <p>Pending: <span className="text-gray-800 dark:text-gray-200 font-medium">{formatCurrency(c.pendingAmount)}</span></p>
                <p className="col-span-2 flex items-center gap-1">
                  {isOverdue(c.nextDueDate, c.status) && <AlertTriangle size={12} className="text-red-500" />}
                  Due: <span className="text-gray-800 dark:text-gray-200 font-medium">{dueLabel(c.nextDueDate, c.financeType)}</span>
                </p>
              </div>
            </Card>
          </Link>
        ))}
        {filtered.length === 0 && <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-10">No customers found.</p>}
      </div>
    </div>
  )
}
