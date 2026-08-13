import React, { createContext, useContext, useState } from 'react'
import { AuthUser } from '../types'

interface AuthContextValue {
  user: AuthUser | null
  login: (user: AuthUser) => void
  logout: () => void
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// Reads whatever session was saved from a previous login, synchronously, before the first
// render happens. Previously this ran in a useEffect (i.e. AFTER the first render), which meant
// on any hard page load/refresh — like typing a URL such as /naveen directly into the address
// bar — the route guards saw `user: null` for a split second and immediately redirected to
// /login, even though a valid saved session existed. That's what caused the login loop.
function loadStoredUser(): AuthUser | null {
  const raw = localStorage.getItem('fcms_user')
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    localStorage.removeItem('fcms_user')
    return null
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadStoredUser)

  const login = (u: AuthUser) => {
    setUser(u)
    localStorage.setItem('fcms_user', JSON.stringify(u))
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('fcms_user')
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin: user?.role === 'Admin' }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
