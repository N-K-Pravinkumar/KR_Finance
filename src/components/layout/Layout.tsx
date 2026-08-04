import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Zap, Users, FileText, ScrollText, Menu, X, LogOut, Wallet, Sun, Moon
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, adminOnly: false },
  { to: '/quick-collection', label: 'Quick Collection', icon: Zap, adminOnly: false },
  { to: '/customers', label: 'Customers', icon: Users, adminOnly: false },
  { to: '/reports', label: 'Reports', icon: FileText, adminOnly: false },
  { to: '/audit-log', label: 'Audit Log', icon: ScrollText, adminOnly: true }
]

export function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const visibleNavItems = navItems.filter((item) => !item.adminOnly || user?.role === 'Admin')

  const ThemeToggleButton = ({ className = '' }: { className?: string }) => (
    <button
      onClick={toggleTheme}
      className={`p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 ${className}`}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0">
        <div className="h-16 flex items-center gap-2 px-5 border-b border-gray-100 dark:border-gray-700">
          <Wallet className="text-blue-600" size={22} />
          <span className="font-bold text-gray-900 dark:text-gray-100 flex-1">KN Finance</span>
          <ThemeToggleButton />
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-100 dark:border-gray-700">
          <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
            Signed in as <span className="font-semibold text-gray-800 dark:text-gray-200">{user?.name}</span> ({user?.role})
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Wallet className="text-blue-600" size={20} />
          <span className="font-bold text-gray-900 dark:text-gray-100">KN Finance</span>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggleButton />
          <button onClick={() => setSidebarOpen(true)} className="p-2 text-gray-600 dark:text-gray-300">
            <Menu size={22} />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-64 bg-white dark:bg-gray-800 h-full shadow-xl flex flex-col">
            <div className="h-14 flex items-center justify-between px-4 border-b border-gray-100 dark:border-gray-700">
              <span className="font-bold text-gray-900 dark:text-gray-100">Menu</span>
              <button onClick={() => setSidebarOpen(false)} className="p-1 text-gray-500 dark:text-gray-300">
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1">
              {visibleNavItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                        : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`
                  }
                >
                  <item.icon size={18} />
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="p-3 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
              >
                <LogOut size={16} /> Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 pt-16 pb-20 lg:pt-6 lg:pb-6 px-4 sm:px-6 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-around py-1.5">
        {visibleNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg text-[10px] font-medium min-w-[56px] ${
                isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
              }`
            }
          >
            <item.icon size={20} />
            {item.label.split(' ')[0]}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
