import { createContext, useContext, useMemo, useState } from 'react'

const AuthContext = createContext(null)
const USER_STORAGE_KEY = 'kpm360.authUser'

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
      clearUser: () => setUser(null),
      pendingUserId,
      setPendingUserId,
      pendingFlow,
      setPendingFlow,
      clearPending: () => {
        setPendingUserId('')
        setPendingFlow('')
      }
    }),
    [user, pendingUserId, pendingFlow]
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
