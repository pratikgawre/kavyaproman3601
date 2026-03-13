import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const AuthContext = createContext(null)

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
  const [user, setUserState] = useState(() => readStoredUser())
  const [pendingUserId, setPendingUserId] = useState('')
  const [pendingFlow, setPendingFlow] = useState('')

  const setUser = useCallback((nextUser) => {
    setUserState((prevUser) => {
      const resolvedUser = typeof nextUser === 'function' ? nextUser(prevUser) : nextUser
      try {
        if (typeof window !== 'undefined') {
          if (resolvedUser) {
            window.localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(resolvedUser))
          } else {
            window.localStorage.removeItem(AUTH_USER_STORAGE_KEY)
          }
        }
      } catch {
        // ignore storage failures (private mode, quota, etc.)
      }
      return resolvedUser
    })
  }, [])

  const clearUser = useCallback(() => setUser(null), [setUser])

  useEffect(() => {
    const userId = user?.id ? String(user.id) : ''
    if (!userId) return

    const controller = new AbortController()

    async function syncUserFromDb() {
      try {
        const res = await fetch(`${API_BASE}/api/user`, {
          headers: { 'X-USER-ID': userId },
          signal: controller.signal
        })
        if (!res.ok) return
        const dbUser = await res.json()
        setUser((prev) => ({
          ...(prev || {}),
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          role: dbUser.role,
          avatar: dbUser.avatar,
          timezone: dbUser.timezone
        }))
      } catch {
        // Keep existing session data when refresh fails.
      }
    }

    syncUserFromDb()
    return () => controller.abort()
  }, [setUser, user?.id])

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
