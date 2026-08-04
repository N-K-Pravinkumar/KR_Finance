import React from 'react'

export function Card({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm ${className}`}>
      {children}
    </div>
  )
}

export function CardHeader({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <div className={`px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-100 dark:border-gray-700 ${className}`}>{children}</div>
}

export function CardContent({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <div className={`px-4 py-3 sm:px-6 sm:py-4 ${className}`}>{children}</div>
}

export function CardTitle({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <h3 className={`text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 ${className}`}>{children}</h3>
}
