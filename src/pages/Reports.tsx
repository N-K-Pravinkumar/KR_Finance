import React, { useEffect, useMemo, useState } from 'react'
import {
  MessageCircle, MessageSquare, Download, FileText, FileSpreadsheet, Search,
  Wallet, TrendingUp, TrendingDown, CalendarClock, IndianRupee, CheckCircle2, XCircle
} from 'lucide-react'
import { api } from '../api/client'
import { Customer, Payment, OrgSummary, DailyReport } from '../types'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { formatCurrency, formatDate, dueLabel, buildWhatsAppMessage, buildWhatsAppLink } from '../utils/format'

function statusBadgeColor(status: string): 'green' | 'red' | 'yellow' | 'purple' | 'blue' | 'gray' {
  if (status === 'Paid') return 'green'
  if (status === 'NotPaid') return 'red'
  if (status === 'Partial') return 'yellow'
  if (status === 'Advance') return 'purple'
  if (status === 'Pending') return 'blue'
  return 'gray' // Not Due Yet
}

async function downloadBlob(url: string, params: Record<string, any>, filename: string, mime: string) {
  const res = await api.get(url, { params, responseType: 'blob' })
  const blob = new Blob([res.data], { type: mime })
  const objUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objUrl
  a.download = filename
  a.click()
  URL.revokeObjectURL(objUrl)
}

const PDF_MIME = 'application/pdf'
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

/** Dashboard-style KPI tile: icon chip + big bold value + label — used to give the Reports
 * page the same premium at-a-glance summary look as the Dashboard's own stat cards. */
function StatTile({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: React.ElementType; color: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{label}</p>
          <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mt-1 truncate">{value}</p>
        </div>
        <div className={`p-2 rounded-lg shrink-0 ${color}`}>
          <Icon size={20} />
        </div>
      </div>
    </Card>
  )
}

export default function Reports() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [summary, setSummary] = useState<OrgSummary | null>(null)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'downloadable' | 'daily'>('downloadable')
  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null)
  const [dailyReportDate, setDailyReportDate] = useState(new Date().toISOString().slice(0, 10))
  const [dailySearch, setDailySearch] = useState('')

  // Customer / payment pickers for statement, receipt
  const [pickerQuery, setPickerQuery] = useState('')
  const [statementCustomerId, setStatementCustomerId] = useState<number | ''>('')
  const [receiptCustomerId, setReceiptCustomerId] = useState<number | ''>('')
  const [receiptPayments, setReceiptPayments] = useState<Payment[]>([])
  const [receiptPaymentId, setReceiptPaymentId] = useState<number | ''>('')

  // Date range pickers
  const today = new Date().toISOString().slice(0, 10)
  const [dailyDate, setDailyDate] = useState(today)
  const [weeklyDate, setWeeklyDate] = useState(today)
  const [monthYear, setMonthYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [payFrom, setPayFrom] = useState(today)
  const [payTo, setPayTo] = useState(today)

  useEffect(() => {
    api.get('/customers').then((r) => setCustomers(r.data))
    api.get('/reports/summary').then((r) => setSummary(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (activeTab !== 'daily') return
    api.get<DailyReport>('/reports/daily', { params: { date: dailyReportDate } }).then((r) => setDailyReport(r.data))
  }, [activeTab, dailyReportDate])

  const dailyRows = useMemo(() => {
    if (!dailyReport) return []
    const q = dailySearch.toLowerCase()
    return dailyReport.rows.filter((r) => !q || r.name.toLowerCase().includes(q) || r.mobile.includes(q))
  }, [dailyReport, dailySearch])

  useEffect(() => {
    if (!receiptCustomerId) { setReceiptPayments([]); return }
    api.get<Payment[]>(`/payments/customer/${receiptCustomerId}`).then((r) => setReceiptPayments(r.data))
  }, [receiptCustomerId])

  const filtered = useMemo(
    () => customers.filter((c) => c.name.toLowerCase().includes(search.toLowerCase())),
    [customers, search]
  )

  const pickerResults = useMemo(() => {
    if (!pickerQuery) return []
    const q = pickerQuery.toLowerCase()
    return customers.filter((c) => c.name.toLowerCase().includes(q) || c.mobile.includes(q)).slice(0, 8)
  }, [customers, pickerQuery])

  const exportCsv = () => {
    const headers = ['Name', 'Mobile', 'Financed', 'Collected', 'Pending', 'Status', 'Next Due']
    const rows = filtered.map((c) => [c.name, c.mobile, c.financeAmount, c.totalPaid, c.pendingAmount, c.status, c.nextDueDate])
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'org-report.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const sendWhatsApp = (c: Customer) => {
    const msg = buildWhatsAppMessage({
      name: c.name,
      pendingAmount: c.pendingAmount,
      lastPaymentDate: c.lastPaymentDate,
      lastPaymentAmount: c.lastPaymentAmount,
      nextDueDate: c.nextDueDate,
      financeType: c.financeType
    })
    window.open(buildWhatsAppLink(c.mobile, msg), '_blank')
  }

  const sendSms = (c: Customer) => {
    const msg = buildWhatsAppMessage({
      name: c.name,
      pendingAmount: c.pendingAmount,
      lastPaymentDate: c.lastPaymentDate,
      lastPaymentAmount: c.lastPaymentAmount,
      nextDueDate: c.nextDueDate,
      financeType: c.financeType
    })
    window.location.href = `sms:${c.mobile}?body=${encodeURIComponent(msg)}`
  }

  const pdfButtons = [
    { label: 'Daily Collection PDF', action: () => downloadBlob('/reports/pdf/daily-collection', { date: dailyDate }, `daily-collection-${dailyDate}.pdf`, PDF_MIME) },
    { label: 'Weekly Collection PDF', action: () => downloadBlob('/reports/pdf/weekly-collection', { date: weeklyDate }, `weekly-collection-${weeklyDate}.pdf`, PDF_MIME) },
    { label: 'Monthly Collection PDF', action: () => downloadBlob('/reports/pdf/monthly-collection', { year: monthYear, month }, `monthly-collection-${monthYear}-${month}.pdf`, PDF_MIME) },
    { label: 'Pending Report PDF', action: () => downloadBlob('/reports/pdf/pending', {}, 'pending-report.pdf', PDF_MIME) },
    { label: 'Recovery Report PDF', action: () => downloadBlob('/reports/pdf/recovery', {}, 'recovery-report.pdf', PDF_MIME) },
    { label: 'Ledger PDF', action: () => downloadBlob('/reports/pdf/ledger', {}, 'ledger.pdf', PDF_MIME) },
    {
      label: 'Customer Statement PDF',
      action: () => statementCustomerId && downloadBlob(`/reports/pdf/customer-statement/${statementCustomerId}`, {}, `customer-statement-${statementCustomerId}.pdf`, PDF_MIME),
      disabled: !statementCustomerId
    },
    {
      label: 'Receipt PDF',
      action: () => receiptPaymentId && downloadBlob(`/reports/pdf/receipt/${receiptPaymentId}`, {}, `receipt-${receiptPaymentId}.pdf`, PDF_MIME),
      disabled: !receiptPaymentId
    }
  ]

  return (
    <div className="space-y-4 py-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Reports</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Organization-wide and per-customer collection reports</p>
        </div>
        <Button variant="secondary" size="sm" onClick={exportCsv}><Download size={14} /> Export CSV</Button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatTile label="Total Financed" value={formatCurrency(summary.totalFinanced)} icon={IndianRupee} color="text-gray-600 bg-gray-100 dark:bg-gray-700" />
          <StatTile label="Total Collected" value={formatCurrency(summary.totalCollected)} icon={Wallet} color="text-green-600 bg-green-50 dark:bg-green-900/30" />
          <StatTile label="Total Pending" value={formatCurrency(summary.totalPending)} icon={CalendarClock} color="text-amber-600 bg-amber-50 dark:bg-amber-900/30" />
          <StatTile label="Overdue Customers" value={summary.overdueCount} icon={TrendingDown} color="text-red-600 bg-red-50 dark:bg-red-900/30" />
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatTile label="Today's Total Collection (Due)" value={formatCurrency(summary.todayToCollect)} icon={TrendingUp} color="text-blue-600 bg-blue-50 dark:bg-blue-900/30" />
          <StatTile label="Today's Collected Amount" value={formatCurrency(summary.todayCollected)} icon={CheckCircle2} color="text-green-600 bg-green-50 dark:bg-green-900/30" />
          <StatTile label="Today's Pending Amount" value={formatCurrency(summary.todayNotCollected)} icon={XCircle} color="text-red-600 bg-red-50 dark:bg-red-900/30" />
        </div>
      )}

      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${activeTab === 'downloadable' ? 'border-blue-600 text-blue-700 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400'}`}
          onClick={() => setActiveTab('downloadable')}
        >
          Downloadable Reports
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${activeTab === 'daily' ? 'border-blue-600 text-blue-700 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400'}`}
          onClick={() => setActiveTab('daily')}
        >
          Daily Report
        </button>
      </div>

      {activeTab === 'daily' && (
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle>Daily Report</CardTitle>
            <div className="flex items-center gap-2">
              <input type="date" className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm"
                value={dailyReportDate} onChange={(e) => setDailyReportDate(e.target.value)} />
              <Button variant="secondary" size="sm" onClick={() => downloadBlob('/reports/pdf/daily-collection', { date: dailyReportDate }, `daily-collection-${dailyReportDate}.pdf`, PDF_MIME)}>
                <FileText size={14} /> Download PDF
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {dailyReport && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <StatTile label="To Collect Today" value={formatCurrency(dailyReport.totalToCollect)} icon={TrendingUp} color="text-blue-600 bg-blue-50 dark:bg-blue-900/30" />
                  <StatTile label="Collected Today" value={formatCurrency(dailyReport.totalCollected)} icon={Wallet} color="text-green-600 bg-green-50 dark:bg-green-900/30" />
                  <StatTile label="Not Collected" value={formatCurrency(dailyReport.totalNotCollected)} icon={TrendingDown} color="text-red-600 bg-red-50 dark:bg-red-900/30" />
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge color="green">Paid {dailyReport.paidCount}</Badge>
                  <Badge color="red">Not Paid {dailyReport.notPaidCount}</Badge>
                  <Badge color="yellow">Partial {dailyReport.partialCount}</Badge>
                  <Badge color="purple">Advance {dailyReport.advanceCount}</Badge>
                </div>
              </>
            )}

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg pl-9 pr-3 py-2 text-sm"
                placeholder="Search by name or mobile..."
                value={dailySearch}
                onChange={(e) => setDailySearch(e.target.value)}
              />
            </div>

            {/* Desktop/tablet table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-xs uppercase">
                  <tr>
                    <th className="text-left px-3 py-2">Name</th>
                    <th className="text-right px-3 py-2">Daily Amount</th>
                    <th className="text-right px-3 py-2">Collected Today</th>
                    <th className="text-right px-3 py-2">Balance</th>
                    <th className="text-left px-3 py-2">Days Paid</th>
                    <th className="text-left px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyRows.map((r) => (
                    <tr key={r.customerId} className="border-t border-gray-100 dark:border-gray-700">
                      <td className="px-3 py-2">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{r.name}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{r.mobile}</p>
                      </td>
                      <td className="px-3 py-2 text-right text-gray-900 dark:text-gray-100">{formatCurrency(r.dailyCollection)}</td>
                      <td className="px-3 py-2 text-right text-gray-900 dark:text-gray-100">
                        {r.todayAmount != null ? formatCurrency(r.todayAmount) : '—'}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-900 dark:text-gray-100">{formatCurrency(r.balanceAmount)}</td>
                      <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{r.daysPaid} / {r.totalInstallments}</td>
                      <td className="px-3 py-2"><Badge color={statusBadgeColor(r.todayStatus)}>{r.todayStatus}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards (iPhone-width friendly) */}
            <div className="sm:hidden space-y-2">
              {dailyRows.map((r) => (
                <div key={r.customerId} className="border border-gray-100 dark:border-gray-700 rounded-lg p-3">
                  <div className="flex items-start justify-between mb-1.5">
                    <div>
                      <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{r.name}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{r.mobile}</p>
                    </div>
                    <Badge color={statusBadgeColor(r.todayStatus)}>{r.todayStatus}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <p>Daily: <span className="text-gray-800 dark:text-gray-200 font-medium">{formatCurrency(r.dailyCollection)}</span></p>
                    <p>Today: <span className="text-gray-800 dark:text-gray-200 font-medium">{r.todayAmount != null ? formatCurrency(r.todayAmount) : '—'}</span></p>
                    <p>Balance: <span className="text-gray-800 dark:text-gray-200 font-medium">{formatCurrency(r.balanceAmount)}</span></p>
                    <p>Days Paid: <span className="text-gray-800 dark:text-gray-200 font-medium">{r.daysPaid} / {r.totalInstallments}</span></p>
                  </div>
                </div>
              ))}
            </div>

            {dailyRows.length === 0 && <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">No customers found.</p>}
          </CardContent>
        </Card>
      )}

      {activeTab === 'downloadable' && (
      <Card>
        <CardHeader><CardTitle>Downloadable Reports</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Daily report date</label>
              <input type="date" className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm" value={dailyDate} onChange={(e) => setDailyDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Weekly report date</label>
              <input type="date" className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm" value={weeklyDate} onChange={(e) => setWeeklyDate(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Month</label>
                <input type="number" min={1} max={12} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm" value={month} onChange={(e) => setMonth(Number(e.target.value))} />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Year</label>
                <input type="number" className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm" value={monthYear} onChange={(e) => setMonthYear(Number(e.target.value))} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Customer for Statement</label>
              <select className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm"
                value={statementCustomerId} onChange={(e) => setStatementCustomerId(e.target.value ? Number(e.target.value) : '')}>
                <option value="">Select customer...</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.mobile})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Customer for Receipt</label>
              <select className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm mb-2"
                value={receiptCustomerId} onChange={(e) => { setReceiptCustomerId(e.target.value ? Number(e.target.value) : ''); setReceiptPaymentId('') }}>
                <option value="">Select customer...</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.mobile})</option>)}
              </select>
              {receiptCustomerId && (
                <select className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm"
                  value={receiptPaymentId} onChange={(e) => setReceiptPaymentId(e.target.value ? Number(e.target.value) : '')}>
                  <option value="">Select payment...</option>
                  {receiptPayments.map((p) => (
                    <option key={p.id} value={p.id}>{formatDate(p.date)} — {formatCurrency(p.amount)} ({p.type})</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {pdfButtons.map((btn) => (
              <Button key={btn.label} variant="secondary" size="sm" disabled={btn.disabled} onClick={btn.action}>
                <FileText size={14} /> {btn.label}
              </Button>
            ))}
          </div>

          <div className="pt-3 border-t border-gray-100 dark:border-gray-700 space-y-3">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Excel Exports</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button variant="secondary" size="sm" onClick={() => downloadBlob('/reports/excel/customers', {}, 'customers.xlsx', XLSX_MIME)}>
                <FileSpreadsheet size={14} /> Customers Excel (current filters)
              </Button>
              <div className="flex items-center gap-2 flex-wrap">
                <input type="date" className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-2 py-2 text-sm" value={payFrom} onChange={(e) => setPayFrom(e.target.value)} />
                <span className="text-xs text-gray-400">to</span>
                <input type="date" className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-2 py-2 text-sm" value={payTo} onChange={(e) => setPayTo(e.target.value)} />
                <Button variant="secondary" size="sm" onClick={() => downloadBlob('/reports/excel/payments', { from: payFrom, to: payTo }, `payments-${payFrom}-to-${payTo}.xlsx`, XLSX_MIME)}>
                  <FileSpreadsheet size={14} /> Payments Excel
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      )}

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Per-Customer Report</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg pl-9 pr-3 py-2 text-sm"
              placeholder="Search customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            {filtered.map((c) => (
              <div key={c.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border border-gray-100 dark:border-gray-700 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{c.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Pending: {formatCurrency(c.pendingAmount)} &middot; {dueLabel(c.nextDueDate, c.financeType)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge color={c.status === 'Running' ? 'blue' : c.status === 'Completed' ? 'green' : 'gray'}>{c.status}</Badge>
                  <Button size="sm" variant="success" onClick={() => sendWhatsApp(c)}>
                    <MessageCircle size={14} /> WhatsApp
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => sendSms(c)}>
                    <MessageSquare size={14} /> SMS
                  </Button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">No customers found.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
