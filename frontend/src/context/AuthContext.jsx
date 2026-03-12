import { createContext, useContext, useMemo, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(() => {
    try {
      if (typeof window === 'undefined') return null
      const stored = localStorage.getItem('authUser')
      return stored ? JSON.parse(stored) : null
    } catch (err) {
      return null
    }
  })
  const [pendingUserId, setPendingUserId] = useState('')
  const [pendingFlow, setPendingFlow] = useState('')

  const setUser = (nextUser) => {
    setUserState(nextUser || null)
    try {
      if (typeof window === 'undefined') return
      if (nextUser) {
        localStorage.setItem('authUser', JSON.stringify(nextUser))
      } else {
        localStorage.removeItem('authUser')
      }
    } catch (err) {
      // Ignore storage errors
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
