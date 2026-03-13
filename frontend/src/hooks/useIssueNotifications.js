import { useEffect, useMemo, useState } from 'react'

const DEFAULT_LIMIT = 6
const READ_MAP_STORAGE_KEY = 'appNotificationsRead'
const DISMISSED_MAP_STORAGE_KEY = 'appNotificationsDismissed'
const CLEARED_AT_STORAGE_KEY = 'appNotificationsClearedAt'
const EVENTS_STORAGE_KEY = 'appNotificationsEvents'
const MAX_EVENTS = 50

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

function normalizeReadMap(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value
}

function normalizeTimestampMap(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const next = {}
  Object.entries(value).forEach(([key, raw]) => {
    if (!key) return
    const num = typeof raw === 'number' ? raw : raw === true ? Date.now() : Number(raw)
    if (Number.isFinite(num) && num > 0) next[key] = num
  })
  return next
}

function safeJsonParse(raw, fallback) {
  try {
    return raw ? JSON.parse(raw) : fallback
  } catch (err) {
    void err
    return fallback
  }
}

function loadReadMap() {
  const parsed = safeJsonParse(localStorage.getItem(READ_MAP_STORAGE_KEY), {})
  return normalizeReadMap(parsed)
}

function loadDismissedMap() {
  const parsed = safeJsonParse(localStorage.getItem(DISMISSED_MAP_STORAGE_KEY), {})
  return normalizeTimestampMap(parsed)
}

function loadClearedAt() {
  const raw = localStorage.getItem(CLEARED_AT_STORAGE_KEY) || ''
  const num = Number(raw)
  return Number.isFinite(num) && num > 0 ? num : 0
}

function loadEvents() {
  const parsed = safeJsonParse(localStorage.getItem(EVENTS_STORAGE_KEY), [])
  if (!Array.isArray(parsed)) return []
  return parsed.filter((item) => item && typeof item === 'object' && typeof item.id === 'string' && typeof item.title === 'string')
}

function buildIssueNotifications(items, readMap) {
  const issues = Array.isArray(items) ? items : []
  const map = normalizeReadMap(readMap)

  return issues
    .map((issue, idx) => {
      const id = issue?.id || `issue-${idx}`
      const issueDate = parseDateValue(issue?.updatedAt || issue?.createdAt)
      const ts = issueDate?.getTime() || 0
      const projectLabel = (issue?.project || '').toString().trim()
      const typeLabel = (issue?.issueType || issue?.type || 'Issue').toString().trim() || 'Issue'
      const summaryText = (issue?.summary || issue?.title || '').toString().trim() || `#${id}`
      const prefix = projectLabel ? `${projectLabel} - ${typeLabel}` : typeLabel

      return {
        id,
        title: `${prefix}: ${summaryText}`,
        time: formatRelativeTime(issue?.updatedAt || issue?.createdAt),
        read: Boolean(map[id]),
        variant: normalizeVariantKey(typeLabel || 'issue'),
        href: `/all-my-issues?q=${encodeURIComponent(String(id))}`,
        ts
      }
    })
    .filter((item) => item.id && item.title)
}

function buildEventNotifications(items, readMap) {
  const events = Array.isArray(items) ? items : []
  const map = normalizeReadMap(readMap)

  return events
    .map((event) => {
      const id = event?.id
      const title = event?.title
      if (!id || !title) return null
      const eventDate = parseDateValue(event?.createdAt)
      const ts = eventDate?.getTime() || 0
      return {
        id,
        title,
        time: formatRelativeTime(event?.createdAt),
        read: Boolean(map[id]),
        variant: normalizeVariantKey(event?.type || 'generic'),
        href: resolveEventHref(event?.type),
        ts
      }
    })
    .filter(Boolean)
}

export default function useIssueNotifications({ limit = DEFAULT_LIMIT } = {}) {
  const API_BASE = (import.meta && import.meta.env && import.meta.env.VITE_API_BASE) || 'http://localhost:8080'
  const [readMap, setReadMap] = useState(loadReadMap)
  const [dismissedMap, setDismissedMap] = useState(loadDismissedMap)
  const [clearedAt, setClearedAt] = useState(loadClearedAt)
  const [events, setEvents] = useState(loadEvents)
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    try {
      localStorage.setItem(READ_MAP_STORAGE_KEY, JSON.stringify(readMap))
    } catch (err) {
      void err
    }
  }, [readMap])

  useEffect(() => {
    try {
      localStorage.setItem(DISMISSED_MAP_STORAGE_KEY, JSON.stringify(dismissedMap))
    } catch (err) {
      void err
    }
  }, [dismissedMap])

  useEffect(() => {
    try {
      localStorage.setItem(CLEARED_AT_STORAGE_KEY, String(clearedAt || 0))
    } catch (err) {
      void err
    }
  }, [clearedAt])

  useEffect(() => {
    try {
      localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(events))
    } catch (err) {
      void err
    }
  }, [events])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      try {
        const res = await fetch(`${API_BASE}/api/issues`)
        if (!res.ok) throw new Error('failed to fetch')
        const data = await res.json()
        if (cancelled) return
        setIssues(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error('load notifications failed', err)
        if (cancelled) return
        setIssues([])
        setError('Unable to load notifications')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [API_BASE])

  const notifications = useMemo(() => {
    const limitCount = Math.max(0, Number(limit) || DEFAULT_LIMIT)
    const merged = [
      ...buildEventNotifications(events, readMap),
      ...buildIssueNotifications(issues, readMap)
    ]
      .filter((item) => {
        const ts = item?.ts || 0
        if (clearedAt && ts <= clearedAt) return false
        const dismissedAt = dismissedMap?.[item?.id]
        if (!dismissedAt) return true
        return ts > dismissedAt
      })
      .sort((a, b) => (b.ts || 0) - (a.ts || 0))
      .slice(0, limitCount)
      .map((item) => {
        const { ts, ...rest } = item
        void ts
        return rest
      })

    return merged
  }, [clearedAt, dismissedMap, events, issues, limit, readMap])

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications])

  function markAsRead(id) {
    if (!id) return
    setReadMap((prev) => ({ ...prev, [id]: true }))
  }

  function markAllAsRead() {
    setReadMap((prev) => {
      const next = { ...prev }
      notifications.forEach((n) => {
        if (n?.id) next[n.id] = true
      })
      return next
    })
  }

  function addNotification({ id, title, type = 'generic', createdAt } = {}) {
    const nextId =
      typeof id === 'string' && id.trim()
        ? id.trim()
        : `local-${Date.now()}-${Math.random().toString(16).slice(2)}`
    const nextTitle = (title || '').toString().trim()
    if (!nextTitle) return

    const event = {
      id: nextId,
      title: nextTitle,
      type: (type || 'generic').toString(),
      createdAt: createdAt || new Date().toISOString()
    }

    setEvents((current) => [event, ...(Array.isArray(current) ? current : [])].slice(0, MAX_EVENTS))
  }

  function dismissNotification(id) {
    if (!id) return
    const dismissedAt = Date.now()
    setDismissedMap((prev) => ({ ...(prev || {}), [id]: dismissedAt }))
    setEvents((current) => (Array.isArray(current) ? current.filter((event) => event?.id !== id) : []))
  }

  function clearAllNotifications() {
    setClearedAt(Date.now())
    setEvents([])
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
    clearAllNotifications
  }
}
