import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate, useParams } from 'react-router-dom'
import './Dashboard.css'
import './Backlog.css'
import {
  FiGrid,
  FiFolder,
  FiUsers,
  FiBarChart2,
  FiCreditCard,
  FiSettings,
  FiLogOut,
  FiMenu,
  FiSearch,
  FiBell,
  FiPlus,
  FiRepeat,
  FiArrowRight,
  FiFilter,
  FiPlayCircle,
  FiBookOpen,
  FiAlertCircle,
  FiCheckSquare,
  FiZap,
  FiX
} from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import useIssueNotifications from '../hooks/useIssueNotifications'
import IssueDetailModal from '../components/IssueDetailModal'

function getInitials(name) {
  if (!name) return ''
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

const normalizeRole = (role) => (role || '').trim().toLowerCase()
const normalizeMemberRole = (role) => (
  (role || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
)
const isDeveloperRole = (role) => {
  const normalized = normalizeMemberRole(role)
  return normalized === 'developer' || normalized === 'dev' || normalized.includes('developer')
}
const isTesterRole = (role) => {
  const normalized = normalizeMemberRole(role)
  return normalized === 'tester' || normalized === 'qa' || normalized.includes('tester') || normalized.includes('quality assurance')
}
const isManagerRole = (role) => {
  const normalized = normalizeMemberRole(role)
  return normalized === 'project manager'
    || normalized === 'projectmanager'
    || normalized === 'project-manager'
    || normalized === 'pm'
    || normalized === 'admin'
}
const normalizeProjectKey = (value) => (value || '').trim().toUpperCase()
const getProjectVisual = (project) => {
  const candidates = [
    project?.icon,
    project?.image,
    project?.imageUrl,
    project?.iconUrl,
    project?.logoUrl
  ]
  for (const candidate of candidates) {
    const value = (candidate || '').toString().trim()
    if (value) return value
  }
  return ''
}
const isImageProjectVisual = (value) => {
  const normalized = (value || '').toString().trim().toLowerCase()
  if (!normalized) return false
  return normalized.startsWith('http://')
    || normalized.startsWith('https://')
    || normalized.startsWith('data:image/')
    || normalized.startsWith('blob:')
    || normalized.startsWith('/')
}
const matchesProjectToken = (project, token) => {
  const rawToken = (token || '').toString().trim()
  if (!rawToken) return false
  const normalizedToken = normalizeProjectKey(rawToken)
  const projectKey = normalizeProjectKey(project?.projectKey || '')
  const projectDbId = (project?.id || '').toString().trim()
  return Boolean(
    (projectKey && projectKey === normalizedToken) ||
    (projectDbId && projectDbId === rawToken)
  )
}

const normalizeSprintStatus = (status) => {
  const normalized = (status || '').toLowerCase().trim()
  if (normalized === 'active' || normalized === 'started' || normalized === 'in progress' || normalized === 'in-progress') return 'active'
  if (normalized === 'completed' || normalized === 'complete' || normalized === 'done') return 'completed'
  return 'planned'
}

const normalizeIssueType = (issueType) => {
  const normalized = (issueType || '').toString().toLowerCase().trim()
  if (!normalized) return 'task'
  if (normalized === 'story' || normalized === 'bug' || normalized === 'task' || normalized === 'epic') return normalized
  return 'task'
}

const ISSUE_STATUS_LABELS = {
  todo: 'To Do',
  progress: 'In Progress',
  review: 'In Review',
  done: 'Done'
}

const normalizePriority = (priority, difficulty) => {
  const normalized = (priority || '').toString().toLowerCase().trim()
  if ([ 'high', 'medium', 'low'].includes(normalized)) return normalized
  const diff = (difficulty || '').toString().toLowerCase().trim()
  if (diff === 'high') return 'high'
  if (diff === 'low') return 'low'
  return 'medium'
}

const normalizeIssueStatus = (status) => {
  const normalized = (status || '').toString().toLowerCase().trim()
  if (normalized === 'todo' || normalized === 'to-do' || normalized === 'to do') return 'todo'
  if (normalized === 'progress' || normalized === 'in-progress' || normalized === 'in progress') return 'progress'
  if (normalized === 'review' || normalized === 'in-review' || normalized === 'in review') return 'review'
  if (normalized === 'done' || normalized === 'completed' || normalized === 'complete') return 'done'
  return 'todo'
}

const pointsFromDifficulty = (difficulty) => {
  const diff = (difficulty || '').toLowerCase().trim()
  if (diff === 'high') return 8
  if (diff === 'low') return 2
  return 5
}

const parseIsoDateParts = (value) => {
  if (!value) return null
  const [year, month, day] = value.split('-').map((part) => Number(part))
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null
  return { year, month, day }
}

const toUtcDateFromIso = (value) => {
  const parts = parseIsoDateParts(value)
  if (!parts) return null
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day))
}

const toLocalDateFromIso = (value) => {
  const parts = parseIsoDateParts(value)
  if (!parts) return null
  return new Date(parts.year, parts.month - 1, parts.day)
}

const formatDisplayDate = (value) => {
  if (!value) return ''
  const date = toLocalDateFromIso(value)
  if (!date) return value
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

const formatDeadlineDate = (value) => {
  if (!value) return 'TBD'
  const trimmed = value.toString().trim()
  if (!trimmed) return 'TBD'
  const isoDate = toLocalDateFromIso(trimmed)
  if (isoDate) {
    return isoDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  }
  const parsed = new Date(trimmed)
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  }
  return trimmed
}

const diffDaysInclusive = (start, end) => {
  const startDate = toUtcDateFromIso(start)
  const endDate = toUtcDateFromIso(end)
  if (!startDate || !endDate) return null
  const diff = Math.floor((endDate.getTime() - startDate.getTime()) / 86400000)
  if (diff < 0) return null
  return diff + 1
}

const addDaysToIso = (value, days) => {
  const date = toUtcDateFromIso(value)
  if (!date) return ''
  date.setUTCDate(date.getUTCDate() + Number(days || 0))
  return date.toISOString().slice(0, 10)
}

const todayIsoDate = () => new Date().toISOString().slice(0, 10)

const createBacklogFilters = () => ({
  status: [],
  type: [],
  priority: [],
  assignee: [],
  assignedBy: [],
  label: []
})

const createActiveSprintFilters = () => ({
  status: [],
  type: [],
  priority: [],
  assignedTo: [],
  assignedBy: []
})

const buildMemberLookup = (members) => {
  const lookup = new Map()
  ;(members || []).forEach((member) => {
    const name = (member?.name || '').toString().trim()
    const email = (member?.email || '').toString().trim()
    const label = name || email
    if (!label) return
    if (name) lookup.set(name.toLowerCase(), label)
    if (email) lookup.set(email.toLowerCase(), label)
  })
  return lookup
}

function renderIssueIcon(type) {
  if (type === 'bug') {
    return <FiAlertCircle />
  }

  if (type === 'story') {
    return <FiBookOpen />
  }

  if (type === 'epic') {
    return <FiZap />
  }

  return <FiCheckSquare />
}

const parseCssSize = (value) => {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const getScrollableListHeight = (listElement, maxItems = 5) => {
  if (!listElement) return ''
  const items = Array.from(listElement.children || [])
  if (items.length === 0) return ''
  const computed = window.getComputedStyle(listElement)
  const gap = parseCssSize(computed.rowGap || computed.gap)
  const paddingTop = parseCssSize(computed.paddingTop)
  const paddingBottom = parseCssSize(computed.paddingBottom)
  const count = Math.min(maxItems, items.length)
  let height = paddingTop + paddingBottom + gap * Math.max(0, count - 1)
  for (let index = 0; index < count; index += 1) {
    height += items[index].getBoundingClientRect().height
  }
  return `${Math.ceil(height)}px`
}

export default function Backlog() {
  const navigate = useNavigate()
  const location = useLocation()
  const { projectId } = useParams()
  const { user, clearUser } = useAuth()
  const [profileUser, setProfileUser] = useState(null)
  const currentUser = profileUser || user || {}
  const displayName = currentUser?.name || (currentUser?.email ? currentUser.email.split('@')[0] : 'Guest')
  const avatar = currentUser?.avatar || ''
  const avatarInitials = getInitials(displayName || 'Guest')
  const roleValue = normalizeRole(currentUser?.role)
  const isDeveloper = roleValue === 'developer'
  const isTester = roleValue === 'tester'
  const isProjectManager = roleValue === 'admin' || roleValue === 'project manager'
  const canUseFilters = !isDeveloper && !isTester
  const userId = currentUser?.id || user?.id
  const API_BASE = (import.meta?.env?.VITE_API_BASE || 'http://localhost:8080')
  const [selectedOrg, setSelectedOrg] = useState(() => { try { return typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('org') || 'null') : null } catch { return null } })
  useEffect(() => {
    function onOrgChanged(e){ const org = e?.detail || null; setSelectedOrg(org); try { if (org) localStorage.setItem('org', JSON.stringify(org)) } catch { /* ignore storage write failures */ } }
    window.addEventListener('org:changed', onOrgChanged)
    return () => window.removeEventListener('org:changed', onOrgChanged)
  }, [])
  useEffect(() => {
    if (!user?.id) return
    let isMounted = true
    fetch(`${API_BASE}/api/user`, {
      headers: { 'X-USER-ID': String(user.id) }
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted || !data) return
        setProfileUser(data)
      })
      .catch(() => {})
      .finally(() => {})

    return () => { isMounted = false }
  }, [API_BASE, user?.id])
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [topSearchText, setTopSearchText] = useState('')
  const [showNotifications, setShowNotifications] = useState(false)
  const {
    notifications,
    unreadCount,
    loading: notificationsLoading,
    error: notificationsError,
    markAsRead: markNotificationRead,
    markAllAsRead: markAllNotificationsRead,
    dismissNotification,
    clearAllNotifications
  } = useIssueNotifications({ limit: 6 })
  const notificationRef = useRef(null)
  const topSearchInputRef = useRef(null)
  const projectFromState = location.state?.project
  const routeProjectToken = (projectId || '').toString().trim()
  const [projectDetails, setProjectDetails] = useState(null)
  const projectKeyRaw = (projectFromState?.projectKey || projectDetails?.projectKey || routeProjectToken || projectFromState?.id || '').trim()
  const activeProjectKey = normalizeProjectKey(projectKeyRaw)
  const activeProject = useMemo(() => {
    const baseProject = projectDetails
      ? { ...(projectFromState || {}), ...projectDetails }
      : (projectFromState || {})
    return {
      ...baseProject,
      id: activeProjectKey || (baseProject?.id || '').toString().trim() || routeProjectToken || 'PROJECT',
      projectKey: activeProjectKey || normalizeProjectKey(baseProject?.projectKey || baseProject?.id || routeProjectToken || '') || '',
      name: baseProject?.name || projectKeyRaw || activeProjectKey || 'Project'
    }
  }, [activeProjectKey, projectDetails, projectFromState, projectKeyRaw, routeProjectToken])
  const projectVisual = useMemo(() => getProjectVisual(activeProject), [activeProject])
  const projectVisualIsImage = isImageProjectVisual(projectVisual)
  const projectTeamMembers = useMemo(
    () => (Array.isArray(activeProject?.teamMembers) ? activeProject.teamMembers : []),
    [activeProject?.teamMembers]
  )
  const [issues, setIssues] = useState([])
  const [issuesLoading, setIssuesLoading] = useState(true)
  const [issuesError, setIssuesError] = useState('')
  const [showActiveSprintFilters, setShowActiveSprintFilters] = useState(false)
  const [activeSprintFilters, setActiveSprintFilters] = useState(createActiveSprintFilters)
  const [showBacklogFilters, setShowBacklogFilters] = useState(false)
  const [backlogFilters, setBacklogFilters] = useState(createBacklogFilters)
  const activeIssueListRef = useRef(null)
  const backlogIssueListRef = useRef(null)
  const [activeIssueListMaxHeight, setActiveIssueListMaxHeight] = useState('')
  const [backlogIssueListMaxHeight, setBacklogIssueListMaxHeight] = useState('')
  const [sprints, setSprints] = useState([])
  const [sprintsLoading, setSprintsLoading] = useState(true)
  const [sprintsError, setSprintsError] = useState('')
  const [selectedIssue, setSelectedIssue] = useState(null)
  const [draggingIssueId, setDraggingIssueId] = useState(null)
  const [dragOverTarget, setDragOverTarget] = useState('')
  const [sprintActionId, setSprintActionId] = useState('')
  const [sprintActionError, setSprintActionError] = useState('')
  const [issueMoveError, setIssueMoveError] = useState('')
  const [showStartSprintModal, setShowStartSprintModal] = useState(false)
  const [startSprintDate, setStartSprintDate] = useState('')
  const [endSprintDate, setEndSprintDate] = useState('')
  const [startSprintFormError, setStartSprintFormError] = useState('')

  useEffect(() => {
    function handleOutsideClick(event) {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  useEffect(() => {
    const hasProjectKey = Boolean(normalizeProjectKey(projectFromState?.projectKey || ''))
    if (!routeProjectToken || (hasProjectKey && projectFromState?.name)) return
    const controller = new AbortController()
    fetch(`${API_BASE}/api/projects`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          const errorText = await res.text()
          throw new Error(errorText || 'Failed to load project')
        }
        return res.json()
      })
      .then((data) => {
        const list = Array.isArray(data) ? data : []
        const match = list.find((project) => matchesProjectToken(project, routeProjectToken))
        setProjectDetails(match || null)
      })
      .catch(() => {
        setProjectDetails(null)
      })

    return () => controller.abort()
  }, [API_BASE, projectFromState?.name, projectFromState?.projectKey, routeProjectToken])

  useEffect(() => {
    if (!activeProjectKey) {
      setIssues([])
      setIssuesLoading(false)
      return
    }
    const controller = new AbortController()
    setIssuesLoading(true)
    setIssuesError('')
    fetch(`${API_BASE}/api/issues?project=${encodeURIComponent(activeProjectKey)}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          const errorText = await res.text()
          throw new Error(errorText || 'Failed to load issues')
        }
        return res.json()
      })
      .then((data) => {
        setIssues(Array.isArray(data) ? data : [])
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setIssues([])
        setIssuesError(err.message || 'Failed to load issues')
      })
      .finally(() => {
        setIssuesLoading(false)
      })

    return () => controller.abort()
  }, [API_BASE, activeProjectKey])

  useEffect(() => {
    if (!activeProjectKey) {
      setSprints([])
      setSprintsLoading(false)
      return
    }
    const controller = new AbortController()
    setSprintsLoading(true)
    setSprintsError('')
    fetch(`${API_BASE}/api/sprints?project=${encodeURIComponent(activeProjectKey)}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          const errorText = await res.text()
          throw new Error(errorText || 'Failed to load sprints')
        }
        return res.json()
      })
      .then((data) => {
        setSprints(Array.isArray(data) ? data : [])
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setSprints([])
        setSprintsError(err.message || 'Failed to load sprints')
      })
      .finally(() => {
        setSprintsLoading(false)
      })

    return () => controller.abort()
  }, [API_BASE, activeProjectKey])

  async function refreshSprints() {
    if (!activeProjectKey) {
      setSprints([])
      setSprintsLoading(false)
      return
    }
    setSprintsLoading(true)
    setSprintsError('')
    try {
      const res = await fetch(`${API_BASE}/api/sprints?project=${encodeURIComponent(activeProjectKey)}`)
      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(errorText || 'Failed to load sprints')
      }
      const data = await res.json()
      setSprints(Array.isArray(data) ? data : [])
    } catch (err) {
      setSprints([])
      setSprintsError(err.message || 'Failed to load sprints')
    } finally {
      setSprintsLoading(false)
    }
  }

  async function refreshIssues() {
    if (!activeProjectKey) {
      setIssues([])
      setIssuesLoading(false)
      return
    }
    setIssuesLoading(true)
    setIssuesError('')
    try {
      const res = await fetch(`${API_BASE}/api/issues?project=${encodeURIComponent(activeProjectKey)}`)
      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(errorText || 'Failed to load issues')
      }
      const data = await res.json()
      setIssues(Array.isArray(data) ? data : [])
    } catch (err) {
      setIssues([])
      setIssuesError(err.message || 'Failed to load issues')
    } finally {
      setIssuesLoading(false)
    }
  }

  useEffect(() => {
    if (!mobileSearchOpen) return
    const timeoutId = setTimeout(() => topSearchInputRef.current?.focus(), 0)
    return () => clearTimeout(timeoutId)
  }, [mobileSearchOpen])

  const canManageSprints = isProjectManager

  const issueIdentity = (issue) => (
    (issue?.dbId || issue?.id || issue?.issueKey || issue?.key || '').toString()
  )

  const mappedIssues = useMemo(() => (
    (issues || []).map((issue) => {
      const issueType = normalizeIssueType(issue.issueType || issue.type)
      const labels = Array.isArray(issue.labels) ? issue.labels : []
      const points = Number.isFinite(issue.points) ? issue.points : pointsFromDifficulty(issue.difficulty)
      const statusKey = normalizeIssueStatus(issue.status || issue.issueStatus || issue.state)
      const statusLabel = ISSUE_STATUS_LABELS[statusKey] || ISSUE_STATUS_LABELS.todo
      const priority = normalizePriority(issue.priority, issue.difficulty)
      const rawDeadline = (issue.deadlineDate || issue.dueDate || issue.deadline || '').toString().trim()
      const deadlineLabel = formatDeadlineDate(rawDeadline)
      const assignee = issue.assigneeName || issue.assignee || issue.creatorName || 'Unassigned'
      const assignedBy = issue.creatorName || issue.creatorEmail || 'Unknown'
      return {
        ...issue,
        dbId: issue.id,
        displayKey: issue.issueKey || issue.key || issue.id,
        title: issue.summary || issue.title || 'Untitled issue',
        type: issueType,
        labels,
        points,
        statusKey,
        statusLabel,
        priority,
        deadlineLabel,
        hasDeadline: Boolean(rawDeadline),
        assignee,
        assignedBy,
        sprintId: issue.sprintId || issue.sprint || null
      }
    })
  ), [issues])

  const normalizedSprints = useMemo(() => (
    (sprints || []).map((sprint) => ({
      ...sprint,
      id: (sprint?.id || '').toString(),
      projectKey: normalizeProjectKey(sprint?.projectKey || ''),
      status: normalizeSprintStatus(sprint.status)
    }))
  ), [sprints])

  const projectSprints = useMemo(() => (
    normalizedSprints.filter((sprint) => !activeProjectKey || sprint.projectKey === activeProjectKey)
  ), [activeProjectKey, normalizedSprints])

  const activeSprint = useMemo(
    () => projectSprints.find((sprint) => sprint.status === 'active') || null,
    [projectSprints]
  )
  const plannedSprint = useMemo(
    () => projectSprints.find((sprint) => sprint.status === 'planned') || null,
    [projectSprints]
  )

  const activeSprintDateLabel = useMemo(() => {
    if (!activeSprint?.startDate && !activeSprint?.endDate) return 'Not set'
    if (activeSprint?.startDate && activeSprint?.endDate) {
      return `${formatDisplayDate(activeSprint.startDate)} - ${formatDisplayDate(activeSprint.endDate)}`
    }
    if (activeSprint?.startDate) {
      return `${formatDisplayDate(activeSprint.startDate)} - TBD`
    }
    return `TBD - ${formatDisplayDate(activeSprint.endDate)}`
  }, [activeSprint?.startDate, activeSprint?.endDate])

  const activeSprintDurationDays = useMemo(
    () => diffDaysInclusive(activeSprint?.startDate, activeSprint?.endDate),
    [activeSprint?.startDate, activeSprint?.endDate]
  )

  const activeSprintRemainingDays = useMemo(() => {
    if (!activeSprint?.endDate) return null
    return diffDaysInclusive(todayIsoDate(), activeSprint.endDate)
  }, [activeSprint?.endDate])

  const plannedSprintDateLabel = useMemo(() => {
    if (!plannedSprint?.startDate && !plannedSprint?.endDate) return 'Not set'
    if (plannedSprint?.startDate && plannedSprint?.endDate) {
      return `${formatDisplayDate(plannedSprint.startDate)} - ${formatDisplayDate(plannedSprint.endDate)}`
    }
    if (plannedSprint?.startDate) {
      return `${formatDisplayDate(plannedSprint.startDate)} - TBD`
    }
    return `TBD - ${formatDisplayDate(plannedSprint.endDate)}`
  }, [plannedSprint?.startDate, plannedSprint?.endDate])

  const plannedSprintDurationDays = useMemo(
    () => diffDaysInclusive(plannedSprint?.startDate, plannedSprint?.endDate),
    [plannedSprint?.startDate, plannedSprint?.endDate]
  )

  const startSprintDurationDays = useMemo(
    () => diffDaysInclusive(startSprintDate, endSprintDate),
    [startSprintDate, endSprintDate]
  )

  const activeSprintIssues = useMemo(() => {
    if (!activeSprint?.id) return []
    return mappedIssues.filter((issue) => issue.sprintId === activeSprint.id)
  }, [mappedIssues, activeSprint?.id])

  const plannedSprintIssues = useMemo(() => {
    if (!plannedSprint?.id) return []
    return mappedIssues.filter((issue) => issue.sprintId === plannedSprint.id)
  }, [mappedIssues, plannedSprint?.id])

  const backlogIssues = useMemo(() => {
    const knownSprintIds = new Set(projectSprints.map((sprint) => sprint.id).filter(Boolean))
    return mappedIssues.filter((issue) => {
      const sprintId = issue.sprintId
      if (!sprintId) return true
      if (!knownSprintIds.has(sprintId)) return true
      if (activeSprint?.id === sprintId) return false
      if (plannedSprint?.id === sprintId) return false
      return true
    })
  }, [mappedIssues, projectSprints, activeSprint?.id, plannedSprint?.id])

  const developerTesterMembers = useMemo(
    () => projectTeamMembers.filter((member) => isDeveloperRole(member?.role) || isTesterRole(member?.role)),
    [projectTeamMembers]
  )

  const assignerMembers = useMemo(
    () => projectTeamMembers.filter((member) => isManagerRole(member?.role) || isTesterRole(member?.role)),
    [projectTeamMembers]
  )

  const assignedToOptions = useMemo(() => {
    const lookup = buildMemberLookup(developerTesterMembers)
    const options = new Set()
    backlogIssues.forEach((issue) => {
      const raw = (issue.assignee || '').toString().trim()
      if (!raw || raw.toLowerCase() === 'unassigned') {
        options.add('Unassigned')
        return
      }
      const label = lookup.get(raw.toLowerCase())
      if (label) options.add(label)
    })
    return Array.from(options).sort((a, b) => a.localeCompare(b))
  }, [developerTesterMembers, backlogIssues])

  const assignedByOptions = useMemo(() => {
    const lookup = buildMemberLookup(assignerMembers)
    const options = new Set()
    backlogIssues.forEach((issue) => {
      const raw = (issue.assignedBy || '').toString().trim()
      if (!raw || raw.toLowerCase() === 'unknown') {
        options.add('Unknown')
        return
      }
      const label = lookup.get(raw.toLowerCase())
      if (label) options.add(label)
    })
    return Array.from(options).sort((a, b) => a.localeCompare(b))
  }, [assignerMembers, backlogIssues])

  const activeAssignedToOptions = useMemo(() => {
    const lookup = buildMemberLookup(developerTesterMembers)
    const options = new Set()
    activeSprintIssues.forEach((issue) => {
      const raw = (issue.assignee || '').toString().trim()
      if (!raw || raw.toLowerCase() === 'unassigned') {
        options.add('Unassigned')
        return
      }
      const label = lookup.get(raw.toLowerCase())
      if (label) options.add(label)
    })
    return Array.from(options).sort((a, b) => a.localeCompare(b))
  }, [developerTesterMembers, activeSprintIssues])

  const activeAssignedByOptions = useMemo(() => {
    const lookup = buildMemberLookup(assignerMembers)
    const options = new Set()
    activeSprintIssues.forEach((issue) => {
      const raw = (issue.assignedBy || '').toString().trim()
      if (!raw || raw.toLowerCase() === 'unknown') {
        options.add('Unknown')
        return
      }
      const label = lookup.get(raw.toLowerCase())
      if (label) options.add(label)
    })
    return Array.from(options).sort((a, b) => a.localeCompare(b))
  }, [assignerMembers, activeSprintIssues])

  const activeSprintFiltersActiveCount =
    activeSprintFilters.status.length +
    activeSprintFilters.type.length +
    activeSprintFilters.priority.length +
    activeSprintFilters.assignedTo.length +
    activeSprintFilters.assignedBy.length

  const filteredActiveSprintIssues = useMemo(() => (
    activeSprintIssues.filter((issue) => {
      const statusMatch = !activeSprintFilters.status.length || activeSprintFilters.status.includes(issue.statusKey)
      const typeMatch = !activeSprintFilters.type.length || activeSprintFilters.type.includes(issue.type)
      const priorityMatch = !activeSprintFilters.priority.length || activeSprintFilters.priority.includes(issue.priority)
      const assignedToMatch = !activeSprintFilters.assignedTo.length || activeSprintFilters.assignedTo.includes(issue.assignee)
      const assignedByMatch = !activeSprintFilters.assignedBy.length || activeSprintFilters.assignedBy.includes(issue.assignedBy)
      return statusMatch && typeMatch && priorityMatch && assignedToMatch && assignedByMatch
    })
  ), [activeSprintIssues, activeSprintFilters])

  const backlogLabelOptions = useMemo(() => (
    Array.from(
      new Set(
        backlogIssues.flatMap((issue) => (issue.labels || []))
      )
    ).filter(Boolean).sort((a, b) => a.localeCompare(b))
  ), [backlogIssues])

  const backlogFiltersActiveCount =
    backlogFilters.status.length +
    backlogFilters.type.length +
    backlogFilters.priority.length +
    backlogFilters.assignee.length +
    backlogFilters.assignedBy.length +
    backlogFilters.label.length

  const filteredBacklogIssues = useMemo(() => (
    backlogIssues.filter((issue) => {
      const statusMatch = !backlogFilters.status.length || backlogFilters.status.includes(issue.statusKey)
      const typeMatch = !backlogFilters.type.length || backlogFilters.type.includes(issue.type)
      const priorityMatch = !backlogFilters.priority.length || backlogFilters.priority.includes(issue.priority)
      const assigneeMatch = !backlogFilters.assignee.length || backlogFilters.assignee.includes(issue.assignee)
      const assignedByMatch = !backlogFilters.assignedBy.length || backlogFilters.assignedBy.includes(issue.assignedBy)
      const labelMatch = !backlogFilters.label.length || issue.labels.some((label) => backlogFilters.label.includes(label))
      return statusMatch && typeMatch && priorityMatch && assigneeMatch && assignedByMatch && labelMatch
    })
  ), [backlogIssues, backlogFilters])

  const backlogSummaryText = backlogFiltersActiveCount
    ? `${filteredBacklogIssues.length} of ${backlogIssues.length} issues - Drag issues to sprints to plan your work`
    : `${backlogIssues.length} issues - Drag issues to sprints to plan your work`

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return undefined
    const updateHeights = () => {
      setActiveIssueListMaxHeight(
        filteredActiveSprintIssues.length > 5 ? getScrollableListHeight(activeIssueListRef.current, 5) : ''
      )
      setBacklogIssueListMaxHeight(
        filteredBacklogIssues.length > 5 ? getScrollableListHeight(backlogIssueListRef.current, 5) : ''
      )
    }
    updateHeights()
    window.addEventListener('resize', updateHeights)
    return () => window.removeEventListener('resize', updateHeights)
  }, [filteredActiveSprintIssues, filteredBacklogIssues])

  const isActionLoading = (id) => sprintActionId && id && sprintActionId === id
  const startSprintActionKey = plannedSprint?.id || 'new-sprint'

  function handleLogout() {
    clearUser()
    navigate('/login', { replace: true })
  }

  function toggleNotifications() {
    setShowNotifications((value) => !value)
  }


  function toggleSidebarForScreen() {
    setCollapsed((prev) => {
      const next = !prev
      if (typeof window !== 'undefined' && window.innerWidth < 992) {
        setMobileOpen(!next)
      }
      return next
    })
  }

  function isMobileScreen() {
    return typeof window !== 'undefined' && window.innerWidth <= 768
  }

  function toggleBacklogFilter(group, value) {
    setBacklogFilters((current) => {
      const values = current[group] || []
      const exists = values.includes(value)
      return {
        ...current,
        [group]: exists ? values.filter((item) => item !== value) : [...values, value]
      }
    })
  }

  function clearBacklogFilters() {
    setBacklogFilters(createBacklogFilters())
  }

  function toggleActiveSprintFilter(group, value) {
    setActiveSprintFilters((current) => {
      const values = current[group] || []
      const exists = values.includes(value)
      return {
        ...current,
        [group]: exists ? values.filter((item) => item !== value) : [...values, value]
      }
    })
  }

  function clearActiveSprintFilters() {
    setActiveSprintFilters(createActiveSprintFilters())
  }

  function runIssueSearch() {
    const query = (topSearchText || '').trim()
    if (!query) {
      navigate('/all-my-issues')
      return
    }
    navigate(`/all-my-issues?q=${encodeURIComponent(query)}`)
  }

  function handleTopSearchIconClick(event) {
    event.preventDefault()
    event.stopPropagation()

    if (isMobileScreen() && !mobileSearchOpen) {
      setMobileSearchOpen(true)
      return
    }

    runIssueSearch()
  }

  async function assignIssueToSprint(issueId, sprintId) {
    if (!issueId || !canManageSprints) return
    if (!userId) {
      setIssueMoveError('Sign in to move issues between sprints.')
      return
    }
    setIssueMoveError('')
    try {
      const res = await fetch(`${API_BASE}/api/issues/${encodeURIComponent(issueId)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-USER-ID': String(userId)
        },
        body: JSON.stringify({ sprintId: sprintId || '' })
      })
      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(errorText || 'Failed to move issue')
      }
      const updated = await res.json()
      setIssues((prev) => {
        const next = Array.isArray(prev) ? [...prev] : []
        const index = next.findIndex((item) => item?.id === updated?.id)
        if (index >= 0) {
          next[index] = updated
        } else {
          next.push(updated)
        }
        return next
      })
    } catch (err) {
      setIssueMoveError(err.message || 'Failed to move issue')
    }
  }

  function handleIssueDragStart(event, issue) {
    if (!canManageSprints) return
    const id = issueIdentity(issue)
    if (!id) return
    event.dataTransfer.setData('text/plain', id)
    event.dataTransfer.effectAllowed = 'move'
    setDraggingIssueId(id)
  }

  function handleIssueDragEnd() {
    setDraggingIssueId(null)
    setDragOverTarget('')
  }

  function handleDragOver(event, target) {
    if (!canManageSprints) return
    event.preventDefault()
    if (dragOverTarget !== target) {
      setDragOverTarget(target)
    }
  }

  function handleDragLeave(target) {
    if (!canManageSprints) return
    if (dragOverTarget === target) {
      setDragOverTarget('')
    }
  }

  function handleDrop(event, sprintId) {
    if (!canManageSprints) return
    event.preventDefault()
    const issueId = event.dataTransfer.getData('text/plain')
    const target = dragOverTarget
    setDragOverTarget('')
    if (!issueId) return
    if (!sprintId && target !== 'backlog') return
    assignIssueToSprint(issueId, sprintId)
  }

  function getSprintActionHeaders(includeJson = false) {
    const headers = {}
    if (includeJson) headers['Content-Type'] = 'application/json'
    if (userId) headers['X-USER-ID'] = String(userId)
    return headers
  }

  async function submitSprintAction(sprint, action) {
    const isStartAction = action === 'start'
    const fallbackBody = isStartAction
      ? {
          status: 'active',
          startDate: sprint?.startDate || new Date().toISOString().slice(0, 10)
        }
      : {
          status: 'completed',
          endDate: sprint?.endDate || new Date().toISOString().slice(0, 10)
        }

    let response = await fetch(`${API_BASE}/api/sprints/${encodeURIComponent(sprint.id)}/${action}`, {
      method: 'POST',
      headers: getSprintActionHeaders()
    })

    if (!response.ok) {
      if (![404, 405, 501].includes(response.status)) {
        const errorText = await response.text()
        throw new Error(errorText || `Failed to ${action} sprint`)
      }

      response = await fetch(`${API_BASE}/api/sprints/${encodeURIComponent(sprint.id)}`, {
        method: 'PUT',
        headers: getSprintActionHeaders(true),
        body: JSON.stringify(fallbackBody)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || `Failed to ${action} sprint`)
      }
    }

    return response.json()
  }

  function getNextSprintOrder() {
    const orderedValues = projectSprints
      .map((sprint) => Number(sprint?.order))
      .filter((value) => Number.isFinite(value))

    if (orderedValues.length > 0) {
      return Math.max(...orderedValues) + 1
    }

    return projectSprints.length + 1
  }

  function getNextSprintName(order) {
    const existingNames = new Set(
      projectSprints
        .map((sprint) => (sprint?.name || '').trim().toLowerCase())
        .filter(Boolean)
    )

    let index = Math.max(1, Number(order) || 1)
    while (existingNames.has(`sprint ${index}`)) {
      index += 1
    }

    return `Sprint ${index}`
  }

  function resolveDefaultStartDate() {
    const plannedStart = plannedSprint?.startDate
    if (parseIsoDateParts(plannedStart)) return plannedStart
    return new Date().toISOString().slice(0, 10)
  }

  function resolveDefaultEndDate(startDate) {
    const plannedEnd = plannedSprint?.endDate
    const plannedDuration = plannedEnd ? diffDaysInclusive(startDate, plannedEnd) : null
    if (plannedEnd && plannedDuration && plannedDuration > 1) return plannedEnd
    return addDaysToIso(startDate, 13)
  }

  function openStartSprintModal() {
    if (!activeProjectKey || activeSprint || !canManageSprints) return
    const defaultStart = resolveDefaultStartDate()
    const defaultEnd = resolveDefaultEndDate(defaultStart)
    setStartSprintDate(defaultStart)
    setEndSprintDate(defaultEnd)
    setStartSprintFormError('')
    setShowStartSprintModal(true)
  }

  async function updateSprintWithDates(sprint, startDate, endDate) {
    const response = await fetch(`${API_BASE}/api/sprints/${encodeURIComponent(sprint.id)}`, {
      method: 'PUT',
      headers: getSprintActionHeaders(true),
      body: JSON.stringify({
        status: 'active',
        startDate,
        endDate
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(errorText || 'Failed to start sprint')
    }

    return response.json()
  }

  async function createAndStartSprint(startDate, endDate) {
    const nextOrder = getNextSprintOrder()
    const resolvedStartDate = startDate || new Date().toISOString().slice(0, 10)
    const sprintPayload = {
      projectKey: activeProjectKey,
      name: getNextSprintName(nextOrder),
      goal: activeProject?.name
        ? `Current sprint for ${activeProject.name}`
        : `Current sprint for ${activeProjectKey}`,
      order: nextOrder,
      status: 'active',
      startDate: resolvedStartDate
    }
    if (endDate) {
      sprintPayload.endDate = endDate
    }

    const response = await fetch(`${API_BASE}/api/sprints`, {
      method: 'POST',
      headers: getSprintActionHeaders(true),
      body: JSON.stringify(sprintPayload)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(errorText || 'Failed to create sprint')
    }

    return response.json()
  }

  async function confirmStartSprint() {
    if (!activeProjectKey || activeSprint || !canManageSprints) return
    if (!startSprintDate || !endSprintDate) {
      setStartSprintFormError('Select both start and end dates.')
      return
    }
    const today = todayIsoDate()
    if (startSprintDate < today) {
      setStartSprintFormError('Start date cannot be in the past.')
      return
    }
    const duration = diffDaysInclusive(startSprintDate, endSprintDate)
    if (duration === null || duration <= 1) {
      setStartSprintFormError('End date must be after the start date.')
      return
    }
    setSprintActionError('')
    setStartSprintFormError('')
    setSprintActionId(startSprintActionKey)
    try {
      const updated = plannedSprint?.id
        ? await updateSprintWithDates(plannedSprint, startSprintDate, endSprintDate)
        : await createAndStartSprint(startSprintDate, endSprintDate)
      setSprints((prev) => {
        if (!Array.isArray(prev) || prev.length === 0) return [updated]
        let found = false
        const next = prev.map((item) => {
          if (item.id === updated.id) {
            found = true
            return updated
          }
          return item
        })
        return found ? next : [updated, ...next]
      })
      await refreshSprints()
      setShowStartSprintModal(false)
    } catch (err) {
      const message = err.message || 'Failed to start sprint'
      setSprintActionError(message)
      setStartSprintFormError(message)
    } finally {
      setSprintActionId('')
    }
  }

  async function handleCompleteSprint() {
    if (!activeSprint?.id || !canManageSprints) return
    setSprintActionError('')
    setSprintActionId(activeSprint.id)
    try {
      const updated = await submitSprintAction(activeSprint, 'complete')
      setSprints((prev) => {
        if (!Array.isArray(prev) || prev.length === 0) return [updated]
        let found = false
        const next = prev.map((item) => {
          if (item.id === updated.id) {
            found = true
            return updated
          }
          return item
        })
        return found ? next : [updated, ...next]
      })
      await refreshSprints()
      await refreshIssues()
    } catch (err) {
      setSprintActionError(err.message || 'Failed to complete sprint')
    } finally {
      setSprintActionId('')
    }
  }

  return (
    <div className="backlog-page-root dashboard-root d-flex">
      <aside className={`sidebar d-flex flex-column ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-top">
          <div className="brand d-flex align-items-center">
            <div className="brand-logo">KP</div>
            <div className="brand-name">KavyaProMan 360</div>
          </div>
        </div>

        <div className="org-switch mt-3 d-flex flex-column align-items-stretch gap-2">
          <div className="org-header">
            <div className="org-icon">{selectedOrg?.name ? selectedOrg.name.charAt(0) : 'K'}</div>
            <div className="org-name-only">{selectedOrg?.name || 'Kavya Technologies'}</div>
          </div>
          <button className="switch-org-btn w-100" onClick={() => navigate('/organization')} aria-label="Switch Organization">
            <span className="switch-left"><FiRepeat size={16} className="me-2" /></span>
            <span className="switch-text">Switch Organization</span>
            <FiArrowRight size={16} className="switch-arrow" />
          </button>
        </div>

        <div className="sidebar-inner d-flex flex-column mt-3">
          <div className="nav-scroll">
            <nav className="nav flex-column">
              <NavLink to="/dashboard" className={({ isActive }) => `nav-item d-flex align-items-center mb-2 ${isActive ? 'active' : ''}`}>
                <FiGrid className="me-3 nav-icon" /> <span className="nav-text">Dashboard</span>
              </NavLink>
              <NavLink to="/projects" className={({ isActive }) => `nav-item d-flex align-items-center mb-2 ${isActive ? 'active' : ''}`}>
                <FiFolder className="me-3 nav-icon" /> <span className="nav-text">Projects</span>
              </NavLink>
              <NavLink to="/teams" className={({ isActive }) => `nav-item d-flex align-items-center mb-2 ${isActive ? 'active' : ''}`}>
                <FiUsers className="me-3 nav-icon" /> <span className="nav-text">Teams</span>
              </NavLink>
              <NavLink to="/reports" className={({ isActive }) => `nav-item d-flex align-items-center mb-2 ${isActive ? 'active' : ''}`}>
                <FiBarChart2 className="me-3 nav-icon" /> <span className="nav-text">Reports</span>
              </NavLink>
              <NavLink to="/subscription" className={({ isActive }) => `nav-item d-flex align-items-center mb-2 ${isActive ? 'active' : ''}`}>
                <FiCreditCard className="me-3 nav-icon" /> <span className="nav-text">Subscription</span>
              </NavLink>
              <NavLink to="/settings" className={({ isActive }) => `nav-item d-flex align-items-center mb-2 ${isActive ? 'active' : ''}`}>
                <FiSettings className="me-3 nav-icon" /> <span className="nav-text">Settings</span>
              </NavLink>
            </nav>
          </div>

          <div className="sidebar-footer mt-3 d-flex flex-column align-items-start">
            <div className="profile d-flex align-items-center w-100">
              <div className="avatar-icon">{avatar ? <img src={avatar} alt="avatar" /> : avatarInitials}</div>
              <div className="ms-2 user-info">
                <div className="user-name">{displayName}</div>
                <div className="user-role">{currentUser?.role || 'Member'}</div>
              </div>
            </div>
            <button className="btn logout-badge mt-3" onClick={handleLogout} title="Logout">
              <FiLogOut size={16} className="me-2" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {collapsed && (
        <div className="topbar d-flex align-items-center px-3">
          <div className="d-flex align-items-center">
            <div className="brand-logo">KP</div>
            <div className="ms-2 brand-name">KavyaProMan 360</div>
          </div>
          <div className="ms-auto">
            <button className="btn btn-sm btn-link" onClick={() => setCollapsed(false)} aria-label="Open sidebar">
              <FiMenu size={20} />
            </button>
          </div>
        </div>
      )}

      <button className="mobile-toggle btn btn-sm" onClick={toggleSidebarForScreen} aria-label="Toggle sidebar">
        <FiMenu size={18} />
      </button>

      <div className={`mobile-overlay ${mobileOpen ? 'show' : ''}`} onClick={() => { setMobileOpen(false); setCollapsed(true) }} />

      <main className={`content backlog-content flex-grow-1 p-4 ${collapsed ? 'with-topbar' : ''}`}>
        <header className="backlog-top-strip">
          <div className={`top-search-row ${mobileSearchOpen ? 'mobile-search-open' : ''}`}>
            <div
              className={`input-group top-search-medium ${mobileSearchOpen ? 'mobile-open' : ''}`}
              onClick={() => {
                if (isMobileScreen() && !mobileSearchOpen) {
                  setMobileSearchOpen(true)
                  return
                }
                topSearchInputRef.current?.focus()
              }}
            >
              <button
                type="button"
                className="input-group-text"
                aria-label="Search"
                onClick={handleTopSearchIconClick}
              >
                <FiSearch />
              </button>
              <input
                ref={topSearchInputRef}
                className="form-control"
                placeholder="Search issues, projects..."
                aria-label="Search issues and projects"
                value={topSearchText}
                onChange={(event) => setTopSearchText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') runIssueSearch()
                }}
                onFocus={() => {
                  if (isMobileScreen()) setMobileSearchOpen(true)
                }}
              />
              {mobileSearchOpen && (
                <button
                  type="button"
                  className="dashboard-search-close"
                  aria-label="Close search"
                  onClick={(event) => {
                    event.stopPropagation()
                    setMobileSearchOpen(false)
                  }}
                >
                  <FiX size={16} />
                </button>
              )}
            </div>

            <div className="notification-wrapper me-2" ref={notificationRef}>
              <button className="btn btn-link bell-black" title="Notifications" onClick={toggleNotifications} type="button">
                <FiBell size={20} />
              </button>
              {unreadCount > 0 && <span className="notif-count">{unreadCount}</span>}

              {showNotifications && (
                <div className="notification-dropdown">
                  <div className="notification-header">
                    <span>Notifications</span>
                    {(unreadCount > 0 || notifications.length > 0) && (
                      <div className="notification-actions">
                        {unreadCount > 0 && (
                          <button className="mark-all-btn" type="button" onClick={markAllNotificationsRead}>
                            Mark all read
                          </button>
                        )}
                        {notifications.length > 0 && (
                          <button className="clear-all-btn" type="button" onClick={clearAllNotifications}>
                            Clear all
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="notification-list">
                    {notificationsLoading && (
                      <div className="muted p-3">Loading notifications...</div>
                    )}
                    {!notificationsLoading && notifications.length === 0 && (
                      <div className="muted p-3">{notificationsError || 'No notifications yet'}</div>
                    )}
                    {!notificationsLoading && notifications.length > 0 && notifications.map((item) => (
                      <div
                        key={item.id}
                        className={`notification-item-row ${item.read ? 'read' : 'unread'}`}
                        data-variant={item.variant}
                        onClick={() => {
                          markNotificationRead(item.id)
                          setShowNotifications(false)
                          if (item.href) navigate(item.href)
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            markNotificationRead(item.id)
                            setShowNotifications(false)
                            if (item.href) navigate(item.href)
                          }
                        }}
                      >
                        <div className="notification-item-body">
                          <div className="notification-title">{item.title}</div>
                          <div className="notification-time">{item.time}</div>
                        </div>
                        <button
                          type="button"
                          className="notification-dismiss-btn"
                          aria-label="Dismiss notification"
                          onClick={(event) => {
                            event.stopPropagation()
                            dismissNotification(item.id)
                          }}
                        >
                          <FiX size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {!isDeveloper && (
              <button className="btn create-issue-medium" onClick={() => navigate('/create-issue')}>
                <FiPlus className="me-1" /> Create Issue
              </button>
            )}
          </div>
        </header>

        <section className="backlog-shell">
          <div className="backlog-breadcrumb">
            <span>Projects</span>
            <span>/</span>
            <span className="backlog-breadcrumb-project">
              <span className={`backlog-breadcrumb-project-icon ${projectVisualIsImage ? 'is-image' : ''}`} aria-hidden="true">
                {projectVisualIsImage ? (
                  <img src={projectVisual} alt="" />
                ) : (
                  projectVisual || '📁'
                )}
              </span>
              <span className="backlog-breadcrumb-project-label">{activeProject.name}</span>
            </span>
          </div>

          <div className="backlog-title-row">
            <div className="backlog-title-heading">
              <span className={`backlog-project-icon ${projectVisualIsImage ? 'is-image' : ''}`} aria-hidden="true">
                {projectVisualIsImage ? (
                  <img src={projectVisual} alt="" />
                ) : (
                  projectVisual || '📁'
                )}
              </span>
              <h1>Backlog</h1>
            </div>
            <div className="backlog-title-actions">
              <button className="btn backlog-outline-btn" onClick={() => navigate(`/projects/${activeProjectKey}/board`, { state: { project: activeProject } })}>
                View Board
              </button>  
              
            </div>
          </div>

          {(issuesError || sprintsError || sprintActionError || issueMoveError) && (
            <div className="backlog-empty-state">
              {issuesError || sprintsError || sprintActionError || issueMoveError}
            </div>
          )}

          <article
            className={`backlog-sprint-card ${dragOverTarget === 'active' ? 'backlog-drop-target' : ''}`}
            onDragOver={(event) => handleDragOver(event, 'active')}
            onDragLeave={() => handleDragLeave('active')}
            onDrop={(event) => handleDrop(event, activeSprint?.id || '')}
          >
            <div className="backlog-sprint-head">
              <div className="backlog-sprint-left">
                <span className="backlog-sprint-icon"><FiPlayCircle size={18} /></span>
                <div>
                  <div className="backlog-sprint-title-row">
                    <h2>{activeSprint?.name || 'No active sprint'}</h2>
                    {activeSprint && <span className="backlog-active-pill">ACTIVE</span>}
                  </div>
                  <p>{activeSprint?.goal || 'Start a sprint to track the current work.'}</p>
                  {activeSprint && (
                    <div className="backlog-sprint-dates">
                      <span className="backlog-sprint-date-label">Dates:</span>
                      <span className="backlog-sprint-date-value">{activeSprintDateLabel}</span>
                      <span className="backlog-sprint-duration">
                        Duration: {activeSprintDurationDays ? `${activeSprintDurationDays} day${activeSprintDurationDays === 1 ? '' : 's'}` : 'N/A'}
                      </span>
                      {activeSprint?.endDate && (
                        <span className="backlog-sprint-remaining">
                          {activeSprintRemainingDays !== null
                            ? `Remaining: ${activeSprintRemainingDays} day${activeSprintRemainingDays === 1 ? '' : 's'}`
                            : 'Ended'}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="backlog-sprint-actions">
                {canUseFilters && (
                  <button
                    type="button"
                    className="btn backlog-outline-btn backlog-filter-btn"
                    onClick={() => setShowActiveSprintFilters(true)}
                    disabled={!activeSprint || activeSprintIssues.length === 0}
                  >
                    <FiFilter className="me-1" />
                    Filters
                    {activeSprintFiltersActiveCount > 0 && (
                      <span className="backlog-filter-count">{activeSprintFiltersActiveCount}</span>
                    )}
                  </button>
                )}
                <button
                  className="btn backlog-outline-btn"
                  onClick={handleCompleteSprint}
                  disabled={!activeSprint || !canManageSprints || isActionLoading(activeSprint?.id)}
                >
                  {isActionLoading(activeSprint?.id) ? 'Completing...' : 'Complete Sprint'}
                </button>
              </div>
            </div>

            {issuesLoading || sprintsLoading ? (
              <div className="backlog-empty-state">Loading sprint...</div>
            ) : !activeSprint ? (
              <div className="backlog-empty-state">No active sprint yet.</div>
            ) : activeSprintIssues.length === 0 ? (
              <div className="backlog-empty-state">No issues in this sprint</div>
            ) : filteredActiveSprintIssues.length === 0 ? (
              <div className="backlog-empty-state">No issues match the selected filters</div>
            ) : (
              <div
                ref={activeIssueListRef}
                className={`backlog-issue-list ${filteredActiveSprintIssues.length > 5 ? 'is-scrollable' : ''}`}
                style={activeIssueListMaxHeight ? { maxHeight: activeIssueListMaxHeight } : undefined}
              >
                {filteredActiveSprintIssues.map((issue) => (
                  <div
                    key={issueIdentity(issue)}
                    className={`backlog-issue-row ${draggingIssueId === issueIdentity(issue) ? 'is-dragging' : ''}`}
                    draggable={canManageSprints}
                    onDragStart={(event) => handleIssueDragStart(event, issue)}
                    onDragEnd={handleIssueDragEnd}
                    onClick={() => setSelectedIssue(issue)}
                  >
                    <div className="backlog-issue-main">
                      <span className={`backlog-issue-type backlog-type-${issue.type}`}>
                        {renderIssueIcon(issue.type)}
                      </span>
                      <span className="backlog-issue-key">{issue.displayKey}</span>
                      <span className="backlog-issue-title">{issue.title}</span>
                    </div>
                    <div className="backlog-issue-meta">
                      {issue.labels.map((label) => (
                        <span key={label} className="backlog-label-pill">{label}</span>
                      ))}
                      <span className={`backlog-status-pill backlog-status-${issue.statusKey}`}>{issue.statusLabel}</span>
                      <span className="backlog-points-pill">{issue.points} pts</span>
                      <span className="backlog-assignee">
                        <span className="backlog-avatar" title={issue.assignee}>{getInitials(issue.assignee)}</span>
                        <span className="backlog-assignee-name" title={issue.assignee}>{issue.assignee}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article
            className={`backlog-next-sprint-card ${dragOverTarget === 'planned' ? 'backlog-drop-target' : ''}`}
            onDragOver={(event) => handleDragOver(event, 'planned')}
            onDragLeave={() => handleDragLeave('planned')}
            onDrop={(event) => handleDrop(event, plannedSprint?.id || '')}
          >
            <div className="backlog-next-sprint-head">
              <div>
                <h2>{plannedSprint?.name || 'No upcoming sprint'}</h2>
                <p>{plannedSprint?.goal || 'Create a sprint to plan upcoming work.'}</p>
                {plannedSprint && (
                  <div className="backlog-sprint-dates">
                    <span className="backlog-sprint-date-label">Dates:</span>
                    <span className="backlog-sprint-date-value">{plannedSprintDateLabel}</span>
                    <span className="backlog-sprint-duration">
                      Duration: {plannedSprintDurationDays ? `${plannedSprintDurationDays} day${plannedSprintDurationDays === 1 ? '' : 's'}` : 'N/A'}
                    </span>
                  </div>
                )}
              </div>
              <button
                className="btn backlog-outline-btn"
                onClick={openStartSprintModal}
                disabled={!activeProjectKey || !!activeSprint || !canManageSprints || isActionLoading(startSprintActionKey)}
              >
                {isActionLoading(startSprintActionKey) ? 'Starting...' : 'Start Sprint'}
              </button>
            </div>
            {issuesLoading || sprintsLoading ? (
              <div className="backlog-empty-state">Loading sprint...</div>
            ) : !plannedSprint ? (
              <div className="backlog-empty-state">No upcoming sprint yet.</div>
            ) : plannedSprintIssues.length === 0 ? (
              <div className="backlog-empty-state">No issues in this sprint</div>
            ) : (
              <div className="backlog-issue-list">
                {plannedSprintIssues.map((issue) => (
                  <div
                    key={issueIdentity(issue)}
                    className={`backlog-issue-row ${draggingIssueId === issueIdentity(issue) ? 'is-dragging' : ''}`}
                    draggable={canManageSprints}
                    onDragStart={(event) => handleIssueDragStart(event, issue)}
                    onDragEnd={handleIssueDragEnd}
                    onClick={() => setSelectedIssue(issue)}
                  >
                    <div className="backlog-issue-main">
                      <span className={`backlog-issue-type backlog-type-${issue.type}`}>
                        {renderIssueIcon(issue.type)}
                      </span>
                      <span className="backlog-issue-key">{issue.displayKey}</span>
                      <span className="backlog-issue-title">{issue.title}</span>
                    </div>
                    <div className="backlog-issue-meta">
                      {issue.labels.map((label) => (
                        <span key={label} className="backlog-label-pill">{label}</span>
                      ))}
                      <span className="backlog-points-pill">{issue.points} pts</span>
                      <span className="backlog-assignee">
                        <span className="backlog-avatar" title={issue.assignee}>{getInitials(issue.assignee)}</span>
                        <span className="backlog-assignee-name" title={issue.assignee}>{issue.assignee}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article
            className={`backlog-pool-card ${dragOverTarget === 'backlog' ? 'backlog-drop-target' : ''}`}
            onDragOver={(event) => handleDragOver(event, 'backlog')}
            onDragLeave={() => handleDragLeave('backlog')}
            onDrop={(event) => handleDrop(event, '')}
          >
            <div className="backlog-pool-head">
              <div className="backlog-pool-head-content">
                <h2>Backlog</h2>
                <p>{backlogSummaryText}</p>
              </div>
              {canUseFilters && (
                <button
                  type="button"
                  className="btn backlog-outline-btn backlog-filter-btn"
                  onClick={() => setShowBacklogFilters(true)}
                >
                  <FiFilter className="me-1" />
                  Filters
                  {backlogFiltersActiveCount > 0 && (
                    <span className="backlog-filter-count">{backlogFiltersActiveCount}</span>
                  )}
                </button>
              )}
            </div>

            {issuesLoading || sprintsLoading ? (
              <div className="backlog-empty-state">Loading backlog...</div>
            ) : backlogIssues.length === 0 ? (
              <div className="backlog-empty-state">No issues in backlog</div>
            ) : filteredBacklogIssues.length === 0 ? (
              <div className="backlog-empty-state">No issues match the selected filters</div>
            ) : (
              <div
                ref={backlogIssueListRef}
                className={`backlog-issue-list backlog-pool-list ${filteredBacklogIssues.length > 5 ? 'is-scrollable' : ''}`}
                style={backlogIssueListMaxHeight ? { maxHeight: backlogIssueListMaxHeight } : undefined}
              >
                {filteredBacklogIssues.map((issue) => (
                  <div
                    key={issueIdentity(issue)}
                    className={`backlog-issue-row backlog-pool-row ${draggingIssueId === issueIdentity(issue) ? 'is-dragging' : ''}`}
                    draggable={canManageSprints}
                    onDragStart={(event) => handleIssueDragStart(event, issue)}
                    onDragEnd={handleIssueDragEnd}
                    onClick={() => setSelectedIssue(issue)}
                  >
                    <div className="backlog-issue-main">
                      <span className={`backlog-issue-type backlog-type-${issue.type}`}>
                        {renderIssueIcon(issue.type)}
                      </span>
                      <div className="backlog-issue-content">
                        <div className="backlog-issue-header">
                          <span className="backlog-issue-key">{issue.displayKey}</span>
                          <span className="backlog-issue-title">{issue.title}</span>
                        </div>
                        <div className="backlog-issue-people">
                          <span className="backlog-person-block">
                            <span className="backlog-person-label">Assigned to</span>
                            <span className="backlog-assignment-chip" title={issue.assignee}>{getInitials(issue.assignee)}</span>
                            <span className="backlog-person-name" title={issue.assignee}>{issue.assignee}</span>
                          </span>
                          <span className="backlog-person-separator">•</span>
                          <span className="backlog-person-block">
                            <span className="backlog-person-label">Assigned by</span>
                            <span className="backlog-assignment-chip" title={issue.assignedBy}>{getInitials(issue.assignedBy)}</span>
                            <span className="backlog-person-name" title={issue.assignedBy}>{issue.assignedBy}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="backlog-issue-meta">
                      {issue.labels.map((label) => (
                        <span key={label} className="backlog-label-pill">{label}</span>
                      ))}
                      <span className={`backlog-deadline-pill${issue.hasDeadline ? '' : ' is-empty'}`}>
                        Due {issue.deadlineLabel}
                      </span>
                      <span className="backlog-points-pill">{issue.points} pts</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>
        </section>

        {canUseFilters && showActiveSprintFilters && (
          <div className="filters-modal-overlay" onClick={() => setShowActiveSprintFilters(false)}>
            <div className="filters-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
              <div className="filters-modal-header d-flex align-items-start">
                <div>
                  <h5><FiFilter className="me-2" /> Active Sprint Filters</h5>
                  <p className="muted">Filter active sprint issues by status, type, assigned to/by, and priority.</p>
                </div>
                <button className="btn modal-close" onClick={() => setShowActiveSprintFilters(false)} aria-label="Close">
                  <FiX size={18} />
                </button>
              </div>

              <div className="filters-body">
                <div className="filters-grid">
                  <div className="filters-column">
                    <div className="filter-section">
                      <h6>Status</h6>
                      <div className="filter-list">
                        <label><input type="checkbox" checked={activeSprintFilters.status.includes('todo')} onChange={() => toggleActiveSprintFilter('status', 'todo')} /> To Do</label>
                        <label><input type="checkbox" checked={activeSprintFilters.status.includes('progress')} onChange={() => toggleActiveSprintFilter('status', 'progress')} /> In Progress</label>
                        <label><input type="checkbox" checked={activeSprintFilters.status.includes('review')} onChange={() => toggleActiveSprintFilter('status', 'review')} /> In Review</label>
                        <label><input type="checkbox" checked={activeSprintFilters.status.includes('done')} onChange={() => toggleActiveSprintFilter('status', 'done')} /> Done</label>
                      </div>
                    </div>

                    <div className="filter-section">
                      <h6>Issue Type</h6>
                      <div className="filter-list">
                        <label><input type="checkbox" checked={activeSprintFilters.type.includes('story')} onChange={() => toggleActiveSprintFilter('type', 'story')} /> Story</label>
                        <label><input type="checkbox" checked={activeSprintFilters.type.includes('task')} onChange={() => toggleActiveSprintFilter('type', 'task')} /> Task</label>
                        <label><input type="checkbox" checked={activeSprintFilters.type.includes('bug')} onChange={() => toggleActiveSprintFilter('type', 'bug')} /> Bug</label>
                        <label><input type="checkbox" checked={activeSprintFilters.type.includes('epic')} onChange={() => toggleActiveSprintFilter('type', 'epic')} /> Epic</label>
                      </div>
                    </div>

                    <div className="filter-section">
                      {/* <h6>Assigned By</h6> */}
                      <div className="filter-list">
                        {activeAssignedByOptions.map((member) => (
                          <label key={member}>
                            <input type="checkbox" checked={activeSprintFilters.assignedBy.includes(member)} onChange={() => toggleActiveSprintFilter('assignedBy', member)} /> {member}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="filters-column">
                    <div className="filter-section">
                      <h6>Priority</h6>
                      <div className="filter-list priority-list">
                        {/* <label><input type="checkbox" checked={activeSprintFilters.priority.includes('critical')} onChange={() => toggleActiveSprintFilter('priority')} /><span className="dot dot-red" /> Critical</label> */}
                        <label><input type="checkbox" checked={activeSprintFilters.priority.includes('high')} onChange={() => toggleActiveSprintFilter('priority', 'high')} /><span className="dot dot-orange" /> High</label>
                        <label><input type="checkbox" checked={activeSprintFilters.priority.includes('medium')} onChange={() => toggleActiveSprintFilter('priority', 'medium')} /><span className="dot dot-yellow" /> Medium</label>
                        <label><input type="checkbox" checked={activeSprintFilters.priority.includes('low')} onChange={() => toggleActiveSprintFilter('priority', 'low')} /><span className="dot dot-green" /> Low</label>
                      </div>
                    </div>

                    <div className="filter-section">
                      <h6>Assigned To</h6>
                      <div className="filter-list">
                        {activeAssignedToOptions.map((member) => (
                          <label key={member}>
                            <input type="checkbox" checked={activeSprintFilters.assignedTo.includes(member)} onChange={() => toggleActiveSprintFilter('assignedTo', member)} /> {member}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="filters-modal-footer d-flex align-items-center">
                <button className="link-clear" onClick={clearActiveSprintFilters} type="button">Clear All Filters</button>
                <div className="ms-auto d-flex gap-3">
                  <button className="btn btn-outline-secondary" onClick={() => setShowActiveSprintFilters(false)}>Close</button>
                  <button className="btn save-filter" onClick={() => setShowActiveSprintFilters(false)} type="button">Apply Filters</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {canUseFilters && showBacklogFilters && (
          <div className="filters-modal-overlay" onClick={() => setShowBacklogFilters(false)}>
            <div className="filters-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
              <div className="filters-modal-header d-flex align-items-start">
                <div>
                  <h5><FiFilter className="me-2" /> Backlog Filters</h5>
                  <p className="muted">Refine visible cards by type, assigned to, priority</p>
                </div>
                <button className="btn modal-close" onClick={() => setShowBacklogFilters(false)} aria-label="Close">
                  <FiX size={18} />
                </button>
              </div>

              <div className="filters-body">
                <div className="filters-grid">
                  <div className="filters-column">
                    <div className="filter-section">
                      <h6>Issue Type</h6>
                      <div className="filter-list">
                        <label><input type="checkbox" checked={backlogFilters.type.includes('story')} onChange={() => toggleBacklogFilter('type', 'story')} /> Story</label>
                        <label><input type="checkbox" checked={backlogFilters.type.includes('task')} onChange={() => toggleBacklogFilter('type', 'task')} /> Task</label>
                        <label><input type="checkbox" checked={backlogFilters.type.includes('bug')} onChange={() => toggleBacklogFilter('type', 'bug')} /> Bug</label>
                        <label><input type="checkbox" checked={backlogFilters.type.includes('epic')} onChange={() => toggleBacklogFilter('type', 'epic')} /> Epic</label>
                      </div>
                    </div>

                    <div className="filter-section">
                      {/* <h6>Assigned By</h6> */}
                      <div className="filter-list">
                        {assignedByOptions.map((member) => (
                          <label key={member}>
                            <input type="checkbox" checked={backlogFilters.assignedBy.includes(member)} onChange={() => toggleBacklogFilter('assignedBy', member)} /> {member}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="filters-column">
                    <div className="filter-section">
                      <h6>Priority</h6>
                      <div className="filter-list priority-list">
                        <label><input type="checkbox" checked={backlogFilters.priority.includes('high')} onChange={() => toggleBacklogFilter('priority', 'high')} /><span className="dot dot-orange" /> High</label>
                        <label><input type="checkbox" checked={backlogFilters.priority.includes('medium')} onChange={() => toggleBacklogFilter('priority', 'medium')} /><span className="dot dot-yellow" /> Medium</label>
                        <label><input type="checkbox" checked={backlogFilters.priority.includes('low')} onChange={() => toggleBacklogFilter('priority', 'low')} /><span className="dot dot-green" /> Low</label>
                      </div>
                    </div>

                    <div className="filter-section">
                      <h6>Assigned To</h6>
                      <div className="filter-list">
                        {assignedToOptions.length === 0 && (
                          <div className="muted">No developer or tester assignments yet.</div>
                        )}
                        {assignedToOptions.map((member) => (
                          <label key={member}>
                            <input type="checkbox" checked={backlogFilters.assignee.includes(member)} onChange={() => toggleBacklogFilter('assignee', member)} /> {member}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="divider" />

                <div className="filter-section">
                  {/* <h6>Labels</h6> */}
                  <div className="filter-list backlog-filter-grid">
                    {backlogLabelOptions.map((label) => (
                      <label key={label}>
                        <input type="checkbox" checked={backlogFilters.label.includes(label)} onChange={() => toggleBacklogFilter('label', label)} /> {label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="filters-modal-footer d-flex align-items-center">
                <button className="link-clear" onClick={clearBacklogFilters} type="button">Clear All Filters</button>
                <div className="ms-auto d-flex gap-3">
                  <button className="btn btn-outline-secondary" onClick={() => setShowBacklogFilters(false)}>Close</button>
                  <button className="btn save-filter" onClick={() => setShowBacklogFilters(false)} type="button">Apply Filters</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showStartSprintModal && (
          <div className="backlog-modal-overlay" onClick={() => setShowStartSprintModal(false)}>
            <div
              className="backlog-modal"
              role="dialog"
              aria-modal="true"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="backlog-modal-header">
                <div>
                  <h3>Start Sprint</h3>
                  <p className="backlog-modal-subtitle">Select the start and end dates for this sprint.</p>
                </div>
                <button
                  type="button"
                  className="backlog-modal-close"
                  aria-label="Close"
                  onClick={() => setShowStartSprintModal(false)}
                >
                  <FiX size={18} />
                </button>
              </div>
              <div className="backlog-modal-body">
                <div className="backlog-modal-row">
                  <label className="backlog-modal-label" htmlFor="sprint-start-date">Start date</label>
                  <input
                    id="sprint-start-date"
                    type="date"
                    className="backlog-modal-input"
                    autoFocus
                    min={todayIsoDate()}
                    value={startSprintDate}
                    onChange={(event) => {
                      const nextValue = event.target.value
                      setStartSprintDate(nextValue)
                      if (startSprintFormError) setStartSprintFormError('')
                      const minEnd = addDaysToIso(nextValue, 1)
                      if (endSprintDate && nextValue && endSprintDate < minEnd) {
                        setEndSprintDate(minEnd)
                      }
                    }}
                  />
                </div>
                <div className="backlog-modal-row">
                  <label className="backlog-modal-label" htmlFor="sprint-end-date">End date</label>
                  <input
                    id="sprint-end-date"
                    type="date"
                    className="backlog-modal-input"
                    min={startSprintDate ? addDaysToIso(startSprintDate, 1) : todayIsoDate()}
                    value={endSprintDate}
                    onChange={(event) => {
                      setEndSprintDate(event.target.value)
                      if (startSprintFormError) setStartSprintFormError('')
                    }}
                  />
                </div>
                <div className="backlog-modal-help">
                  Duration: {startSprintDurationDays ? `${startSprintDurationDays} day${startSprintDurationDays === 1 ? '' : 's'}` : 'Select dates'}
                </div>
                {startSprintFormError && (
                  <div className="backlog-modal-error">{startSprintFormError}</div>
                )}
              </div>
              <div className="backlog-modal-actions">
                <button
                  type="button"
                  className="backlog-modal-cancel"
                  onClick={() => setShowStartSprintModal(false)}
                  disabled={isActionLoading(startSprintActionKey)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="backlog-modal-submit"
                  onClick={confirmStartSprint}
                  disabled={isActionLoading(startSprintActionKey)}
                >
                  {isActionLoading(startSprintActionKey) ? 'Starting...' : 'Start Sprint'}
                </button>
              </div>
            </div>
          </div>
        )}
        {selectedIssue && (
          <IssueDetailModal issue={selectedIssue} onClose={() => setSelectedIssue(null)} />
        )}
      </main>
    </div>
  )
}
