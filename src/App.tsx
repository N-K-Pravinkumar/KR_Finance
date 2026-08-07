import React, { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { Layout } from './components/layout/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import QuickCollection from './pages/QuickCollection'
import Customers from './pages/Customers'
import CustomerForm from './pages/CustomerForm'
import CustomerDetail from './pages/CustomerDetail'
import Reports from './pages/Reports'
import AuditLog from './pages/AuditLog'
import CashLedger from './pages/CashLedger'

// Gives every route a meaningful browser tab title instead of the generic "KR Finance"
// everywhere. CustomerDetail overrides this itself once it knows the customer's name.
const PAGE_TITLES: { test: (path: string) => boolean; title: string }[] = [
  { test: (p) => p === '/login', title: 'Sign In' },
  { test: (p) => p === '/', title: 'Dashboard' },
  { test: (p) => p === '/quick-collection', title: 'Quick Collection' },
  { test: (p) => p === '/customers/new', title: 'Add New Loan' },
  { test: (p) => /^\/customers\/\d+\/edit$/.test(p), title: 'Edit Loan' },
  { test: (p) => /^\/customers\/\d+$/.test(p), title: 'Customer Details' },
  { test: (p) => p === '/customers', title: 'Customers' },
  { test: (p) => p === '/reports', title: 'Reports' },
  { test: (p) => p === '/cash-ledger', title: 'Cash Ledger' },
  { test: (p) => p === '/audit-log', title: 'Audit Log' }
]

function usePageTitle() {
  const location = useLocation()
  useEffect(() => {
    const match = PAGE_TITLES.find((p) => p.test(location.pathname))
    document.title = match ? `${match.title} — KR Finance` : 'KR Finance'
  }, [location.pathname])
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <Layout>{children}</Layout>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'Admin') return <Navigate to="/" replace />
  return <Layout>{children}</Layout>
}

function AppRoutes() {
  usePageTitle()
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/quick-collection" element={<PrivateRoute><QuickCollection /></PrivateRoute>} />
      <Route path="/customers" element={<PrivateRoute><Customers /></PrivateRoute>} />
      <Route path="/customers/new" element={<PrivateRoute><CustomerForm /></PrivateRoute>} />
      <Route path="/customers/:id" element={<PrivateRoute><CustomerDetail /></PrivateRoute>} />
      <Route path="/customers/:id/edit" element={<PrivateRoute><CustomerForm /></PrivateRoute>} />
      <Route path="/reports" element={<PrivateRoute><Reports /></PrivateRoute>} />
      <Route path="/cash-ledger" element={<AdminRoute><CashLedger /></AdminRoute>} />
      <Route path="/audit-log" element={<AdminRoute><AuditLog /></AdminRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  )
}
