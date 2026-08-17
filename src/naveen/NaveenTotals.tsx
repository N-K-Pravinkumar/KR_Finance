import React from 'react'
import { Card } from '../components/ui/Card'
import { formatCurrency } from '../utils/format'

/** The "Total Amount / Total Paid / Total Pending" summary row shown at the top of every Naveen page. */
export function NaveenTotals({ totalAmount, totalPaid, totalPending, amountLabel = 'Total Amount' }: {
  totalAmount: number; totalPaid: number; totalPending: number; amountLabel?: string
}) {
  return (
    <div className="grid grid-cols-1 xs:grid-cols-3 gap-3">
      <Card className="p-3 sm:p-4">
        <p className="text-xs text-gray-500 dark:text-gray-400">{amountLabel}</p>
        <p className="text-base sm:text-xl font-bold text-gray-900 dark:text-gray-100 mt-1 break-words leading-snug">{formatCurrency(totalAmount)}</p>
      </Card>
      <Card className="p-3 sm:p-4">
        <p className="text-xs text-gray-500 dark:text-gray-400">Total Paid</p>
        <p className="text-base sm:text-xl font-bold text-green-600 mt-1 break-words leading-snug">{formatCurrency(totalPaid)}</p>
      </Card>
      <Card className="p-3 sm:p-4">
        <p className="text-xs text-gray-500 dark:text-gray-400">Total Pending</p>
        <p className="text-base sm:text-xl font-bold text-red-600 mt-1 break-words leading-snug">{formatCurrency(totalPending)}</p>
      </Card>
    </div>
  )
}
