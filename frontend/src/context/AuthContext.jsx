import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const AuthContext = createContext(null)
const USER_STORAGE_KEY = 'kpm360.authUser'

const AUTH_USER_STORAGE_KEY = 'kpm360.auth.user'
const API_BASE = (import.meta && import.meta.env && import.meta.env.VITE_API_BASE) || 'http://localhost:8080'

function readStoredUser() {
  try {
    if (typeof window === 'undefined') return null
    const raw = window.localStorage.getItem(AUTH_USER_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    if (parsed.id === null || parsed.id === undefined || parsed.id === '') return null
    return parsed
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(() => {
    if (typeof window === 'undefined') return null
    try {
      const stored = window.localStorage.getItem(USER_STORAGE_KEY)
      if (!stored) return null
      return JSON.parse(stored)
    } catch {
      window.localStorage.removeItem(USER_STORAGE_KEY)
      return null
    }
  })
  const [pendingUserId, setPendingUserId] = useState('')
  const [pendingFlow, setPendingFlow] = useState('')

  const setUser = (nextUser) => {
    const safeUser = nextUser || null
    setUserState(safeUser)
    if (typeof window === 'undefined') return
    if (safeUser) {
      window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(safeUser))
    } else {
      window.localStorage.removeItem(USER_STORAGE_KEY)
    }
  }

  const value = useMemo(
    () => ({
      user,
      setUser,
      clearUser,
      pendingUserId,
      setPendingUserId,
      pendingFlow,
      setPendingFlow,
      clearPending: () => {
        setPendingUserId('')
        setPendingFlow('')
      }
    }),
    [clearUser, pendingFlow, pendingUserId, setUser, user]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
