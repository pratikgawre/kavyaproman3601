import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'

const DEFAULT_LIMIT = 6

function parseDateValue(value) {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (Array.isArray(value) && value.length >= 3) {
    const [year, month, day, hour = 0, minute = 0, second = 0] = value
    const date = new Date(year, (month || 1) - 1, day || 1, hour || 0, minute || 0, second || 0)
    return Number.isNaN(date.getTime()) ? null : date
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    const normalized = trimmed.replace(/(\.\d{3})\d+/, '$1')
    const date = new Date(normalized)
    return Number.isNaN(date.getTime()) ? null : date
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatRelativeTime(dateValue) {
  const date = parseDateValue(dateValue)
  if (!date) return ''
  const now = Date.now()
  const diffMs = now - date.getTime()
  const absMs = Math.abs(diffMs)
  const seconds = Math.floor(absMs / 1000)
  if (seconds < 10) return diffMs >= 0 ? 'just now' : 'soon'
  if (seconds < 60) return diffMs >= 0 ? `${seconds}s ago` : `in ${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return diffMs >= 0 ? `${minutes}m ago` : `in ${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return diffMs >= 0 ? `${hours}h ago` : `in ${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return diffMs >= 0 ? `${days}d ago` : `in ${days}d`
  return date.toLocaleDateString()
}

function normalizeVariantKey(value) {
  const raw = (value || '').toString().trim().toLowerCase()
  if (!raw) return 'generic'
  const normalized = raw
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
  return normalized || 'generic'
}

function resolveEventHref(variant) {
  const key = normalizeVariantKey(variant)
  if (key === 'member-invited') return '/teams'
  if (key === 'project-created') return '/projects'
  return '/dashboard'
}

function toUiNotification(item) {
  const id = item?.id
  const title = (item?.title || '').toString().trim()
  if (!id || !title) return null
  const createdAt = item?.createdAt
  const date = parseDateValue(createdAt)
  const ts = date?.getTime() || 0
  const variant = normalizeVariantKey(item?.type || 'generic')
  const href = (item?.href || '').toString().trim() || resolveEventHref(item?.type)

  return {
    id,
    title,
    time: formatRelativeTime(createdAt),
    read: Boolean(item?.read),
    variant,
    href,
    ts
  }
}

export default function useIssueNotifications({ limit = DEFAULT_LIMIT } = {}) {
  const API_BASE = (import.meta && import.meta.env && import.meta.env.VITE_API_BASE) || 'http://localhost:8080'
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!user?.id) {
        setItems([])
        setLoading(false)
        return
      }
      setLoading(true)
      setError('')
      try {
        const limitCount = Math.max(0, Number(limit) || DEFAULT_LIMIT)
        const qs = limitCount ? `?limit=${encodeURIComponent(String(limitCount))}` : ''
        const res = await fetch(`${API_BASE}/api/notifications${qs}`, { headers: { 'X-USER-ID': String(user.id) } })
        if (!res.ok) throw new Error('failed to fetch')
        const data = await res.json()
        if (cancelled) return
        setItems(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error('load notifications failed', err)
        if (cancelled) return
        setItems([])
        setError('Unable to load notifications')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [API_BASE, limit, refreshKey, user?.id])

  const notifications = useMemo(() => {
    const limitCount = Math.max(0, Number(limit) || DEFAULT_LIMIT)
    return (Array.isArray(items) ? items : [])
      .map(toUiNotification)
      .filter(Boolean)
      .sort((a, b) => (b.ts || 0) - (a.ts || 0))
      .slice(0, limitCount)
      .map((item) => {
        const { ts, ...rest } = item
        void ts
        return rest
      })
  }, [items, limit])

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications])

  async function markAsRead(id) {
    if (!id || !user?.id) return
    try {
      const res = await fetch(`${API_BASE}/api/notifications/${encodeURIComponent(String(id))}/read`, {
        method: 'PUT',
        headers: { 'X-USER-ID': String(user.id) }
      })
      if (!res.ok) throw new Error('mark read failed')
      setItems((prev) => (Array.isArray(prev) ? prev.map((n) => (n?.id === id ? { ...n, read: true } : n)) : []))
    } catch (err) {
      console.error('mark read failed', err)
    }
  }

  function markAllAsRead() {
    const ids = notifications.filter((n) => n?.id && !n.read).map((n) => n.id)
    Promise.all(ids.map((id) => markAsRead(id))).catch(() => {})
  }

  async function addNotification({ title, type = 'generic', href } = {}) {
    if (!user?.id) return
    const nextTitle = (title || '').toString().trim()
    if (!nextTitle) return

    const payload = {
      title: nextTitle,
      type: (type || 'generic').toString(),
      href: (href || '').toString().trim() || resolveEventHref(type)
    }

    try {
      const res = await fetch(`${API_BASE}/api/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-USER-ID': String(user.id) },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error('create notification failed')
      if (res.status === 204) return
      const created = await res.json()
      setItems((current) => [created, ...(Array.isArray(current) ? current : [])])
    } catch (err) {
      console.error('create notification failed', err)
    }
  }

  async function dismissNotification(id) {
    if (!id || !user?.id) return
    try {
      const res = await fetch(`${API_BASE}/api/notifications/${encodeURIComponent(String(id))}`, {
        method: 'DELETE',
        headers: { 'X-USER-ID': String(user.id) }
      })
      if (!res.ok) throw new Error('dismiss notification failed')
      setItems((current) => (Array.isArray(current) ? current.filter((n) => n?.id !== id) : []))
    } catch (err) {
      console.error('dismiss notification failed', err)
    }
  }

  async function clearAllNotifications() {
    if (!user?.id) return
    try {
      const res = await fetch(`${API_BASE}/api/notifications`, {
        method: 'DELETE',
        headers: { 'X-USER-ID': String(user.id) }
      })
      if (!res.ok) throw new Error('clear notifications failed')
      setItems([])
    } catch (err) {
      console.error('clear notifications failed', err)
    }
  }

  function refreshNotifications() {
    setRefreshKey((prev) => prev + 1)
  }

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    addNotification,
    dismissNotification,
    clearAllNotifications,
    refreshNotifications
  }
}
