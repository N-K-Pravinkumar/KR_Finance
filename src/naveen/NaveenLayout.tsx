import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Carrot, LogOut, Sun, Moon, ArrowLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { NaveenTabs } from './NaveenTabs'

/**
 * Standalone shell for Naveen's business section — deliberately separate from the KR Finance
 * Layout/sidebar so it feels and looks like its own app, even though it shares the same login.
 */
export function NaveenLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="safe-top bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Carrot className="text-green-600" size={22} />
            <span className="font-bold text-gray-900 dark:text-gray-100">Naveen</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Link
              to="/"
              className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100 px-2 py-1.5"
            >
              <ArrowLeft size={14} /> KR Finance
            </Link>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <span className="hidden sm:inline text-xs text-gray-500 dark:text-gray-400">
              {user?.name} ({user?.role})
            </span>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-4">
        <NaveenTabs />
        {children}
      </main>
    </div>
  )
}
