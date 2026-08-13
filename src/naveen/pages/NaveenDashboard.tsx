import React, { useEffect, useState } from 'react'
import { Wallet, TrendingUp, TrendingDown, Carrot } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { formatCurrency } from '../../utils/format'
import { getNaveenDashboard } from '../api/naveenApi'
import { NaveenDashboard as NaveenDashboardData } from '../types'

export default function NaveenDashboard() {
  const [data, setData] = useState<NaveenDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getNaveenDashboard().then(setData).catch(() => setError('Failed to load dashboard.')).finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-sm text-gray-400 dark:text-gray-500 py-10 text-center">Loading...</p>
  if (error) return <p className="text-sm text-red-500 py-10 text-center">{error}</p>
  if (!data) return null

  const cards = [
    { label: 'Cash Available', value: data.cashAvailable, icon: Wallet, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30' },
    { label: 'Money to Receive', value: data.moneyToReceive, icon: TrendingUp, color: 'text-green-600 bg-green-50 dark:bg-green-900/30' },
    { label: 'Money to Pay', value: data.moneyToPay, icon: TrendingDown, color: 'text-red-600 bg-red-50 dark:bg-red-900/30' },
    { label: 'Supplier Balance', value: data.supplierBalance, icon: Carrot, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30' }
  ]

  return (
    <div className="space-y-6 py-2">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Naveen's Business</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Vegetable purchases, borrowed money, and money given out — all in one place</p>
      </div>

      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {cards.map((c) => (
          <Card key={c.label} className="p-3 sm:p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs text-gray-500 dark:text-gray-400">{c.label}</p>
                <p className="text-base sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1 break-words leading-snug">{formatCurrency(c.value)}</p>
              </div>
              <div className={`p-1.5 sm:p-2 rounded-lg shrink-0 ${c.color}`}>
                <c.icon size={18} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card className="p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Active Loans Given</p>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">{data.activeLoans}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Borrowings Recorded</p>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">{data.activeBorrowings}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Suppliers Recorded</p>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">{data.activeSuppliers}</p>
        </Card>
      </div>
    </div>
  )
}
