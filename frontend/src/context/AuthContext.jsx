import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const AuthContext = createContext(null)
const USER_STORAGE_KEY = 'kpm360.authUser'

const AUTH_USER_STORAGE_KEY = 'kpm360.auth.user'

function readStoredSession() {
  try {
    if (typeof window === 'undefined') return null
    const raw = window.localStorage.getItem(USER_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    const id = parsed.id
    if (id === null || id === undefined || id === '') return null
    const session = { id: String(id) }
    try { window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(session)) } catch {}
    return session
  } catch {
    try { window.localStorage.removeItem(USER_STORAGE_KEY) } catch {}
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(() => readStoredSession())
  const [pendingUserId, setPendingUserId] = useState('')
  const [pendingFlow, setPendingFlow] = useState('')

  const setUser = useCallback((nextUser) => {
    const safeUser = nextUser || null
    setUserState(safeUser)
    if (typeof window === 'undefined') return
    if (safeUser?.id) {
      // Persist only the user id; profile fields come from the database.
      window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify({ id: String(safeUser.id) }))
    } else {
      window.localStorage.removeItem(USER_STORAGE_KEY)
    }
  }, [])

  const clearUser = useCallback(() => {
    setUser(null)
    if (typeof window === 'undefined') return
    window.localStorage.removeItem(AUTH_USER_STORAGE_KEY)
  }, [setUser])

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
