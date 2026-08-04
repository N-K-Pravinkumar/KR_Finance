import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Wallet, LogIn } from 'lucide-react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/Button'

export default function Login() {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin123')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/auth/login', { username, password })
      login(res.data)
      navigate('/')
    } catch (err) {
      setError('Invalid username or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white dark:from-gray-900 dark:to-gray-950 px-4">
      <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-blue-600 text-white rounded-xl p-3 mb-3">
            <Wallet size={28} />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">KR Finance</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Collection Management System</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
            <input
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
            <input
              type="password"
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            <LogIn size={16} /> {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
        <div className="mt-6 text-xs text-gray-400 dark:text-gray-500 text-center">
          Demo: admin / admin123 (Admin) &middot; staff / staff123 (Staff)
        </div>
      </div>
    </div>
  )
}
