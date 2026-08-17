import React from 'react'
import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/naveen', label: 'Dashboard' },
  { to: '/naveen/suppliers', label: 'Suppliers' },
  { to: '/naveen/borrowed', label: 'Borrowed' },
  { to: '/naveen/loans', label: 'Money Given' },
  { to: '/naveen/billing', label: 'Billing' },
  { to: '/naveen/expenses', label: 'Expenses' }
]

/** A small sub-navigation bar for Naveen's business section, kept separate from the main KR Finance sidebar. */
export function NaveenTabs() {
  return (
    <div className="flex gap-1 overflow-x-auto pb-1 mb-4 border-b border-gray-200 dark:border-gray-700">
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.to === '/naveen'}
          className={({ isActive }) =>
            `px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
              isActive
                ? 'border-blue-600 text-blue-700 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100'
            }`
          }
        >
          {t.label}
        </NavLink>
      ))}
    </div>
  )
}
