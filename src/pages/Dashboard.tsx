import React, { useEffect, useMemo, useState } from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend
} from 'recharts'
import {
  Users, Wallet, TrendingUp, TrendingDown, CalendarDays, CalendarRange, CalendarClock,
  UserCheck, PercentCircle
} from 'lucide-react'
import { fetchDashboard, DashboardData } from '../api/dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { formatCurrency } from '../utils/format'

const STATUS_COLORS: Record<string, string> = {
  Paid: '#22c55e',
  Partial: '#f59e0b',
  'Not Paid': '#ef4444',
  Advance: '#3b82f6'
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    fetchDashboard()
      .then(setData)
      .catch(() => setError('Failed to load dashboard data.'))
      .finally(() => setLoading(false))
  }, [])

  const paymentStatusData = useMemo(() => {
    if (!data) return []
    const b = data.paymentStatusBreakdown
    return [
      { name: 'Paid', value: b.paidAmount, count: b.paidCount },
      { name: 'Partial', value: b.partialAmount, count: b.partialCount },
      { name: 'Not Paid', value: b.notPaidAmount, count: b.notPaidCount },
      { name: 'Advance', value: b.advanceAmount, count: b.advanceCount }
    ]
  }, [data])

  if (loading) return <p className="text-sm text-gray-400 dark:text-gray-500 py-10 text-center">Loading...</p>
  if (error) return <p className="text-sm text-red-500 py-10 text-center">{error}</p>
  if (!data) return null

  const kpis = [
    { label: "Today's Collection", value: formatCurrency(data.todaysCollection), icon: Wallet, color: 'text-green-600 bg-green-50 dark:bg-green-900/30' },
    { label: 'Weekly Collection', value: formatCurrency(data.weeklyCollection), icon: CalendarDays, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30' },
    { label: 'Monthly Collection', value: formatCurrency(data.monthlyCollection), icon: CalendarRange, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' },
    { label: 'Pending Amount', value: formatCurrency(data.pendingAmount), icon: CalendarClock, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30' },
    { label: 'Overdue Amount', value: formatCurrency(data.overdueAmount), icon: TrendingDown, color: 'text-red-600 bg-red-50 dark:bg-red-900/30' },
    { label: 'Total Customers', value: data.totalCustomers, icon: Users, color: 'text-gray-600 bg-gray-100 dark:bg-gray-700' },
    { label: 'Active Customers', value: data.activeCustomers, icon: UserCheck, color: 'text-teal-600 bg-teal-50 dark:bg-teal-900/30' },
    { label: 'Recovery %', value: `${data.recoveryPercent}%`, icon: PercentCircle, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/30' },
    { label: 'Collection %', value: `${data.collectionPercent}%`, icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30' }
  ]

  return (
    <div className="space-y-6 py-2">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Overview of collections and portfolio health</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{kpi.label}</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1 truncate">{kpi.value}</p>
              </div>
              <div className={`p-2 rounded-lg shrink-0 ${kpi.color}`}>
                <kpi.icon size={20} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Daily Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Weekly Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.weeklyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="weekLabel" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="amount" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Monthly Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="amount" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Pending Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.pendingTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Line type="monotone" dataKey="amount" stroke="#f59e0b" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Payment Status Breakdown</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={paymentStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {paymentStatusData.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
