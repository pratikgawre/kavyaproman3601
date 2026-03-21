import { useEffect, useMemo, useRef, useState } from 'react'
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
  FiUser,
  FiRepeat,
  FiArrowRight,
  FiPlayCircle,
  FiBookOpen,
  FiAlertCircle,
  FiCheckSquare,
  FiZap,
  FiX
} from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import useIssueNotifications from '../hooks/useIssueNotifications'

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
const normalizeProjectKey = (value) => (value || '').trim().toUpperCase()
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
  if (normalized === 'story' || normalized === 'bug' || normalized === 'task' || normalized === 'spike') return normalized
  return 'task'
}

const pointsFromDifficulty = (difficulty) => {
  const diff = (difficulty || '').toLowerCase().trim()
  if (diff === 'high') return 8
  if (diff === 'low') return 2
  return 5
}

function renderIssueIcon(type) {
  if (type === 'bug') {
    return <FiAlertCircle />
  }

  if (type === 'story') {
    return <FiBookOpen />
  }

  if (type === 'spike') {
    return <FiZap />
  }

  return <FiCheckSquare />
}

export default function Backlog() {
  const navigate = useNavigate()
  const location = useLocation()
  const { projectId } = useParams()
  const { user, clearUser } = useAuth()
  const [profileUser, setProfileUser] = useState(null)
  const currentUser = profileUser || user || {}
  const displayName = currentUser?.name || (currentUser?.email ? currentUser.email.split('@')[0] : 'Guest')
  const roleValue = normalizeRole(currentUser?.role)
  const isDeveloper = roleValue === 'developer'
  const isProjectManager = roleValue === 'admin' || roleValue === 'project manager'
  const userId = currentUser?.id || user?.id
  const API_BASE = (import.meta?.env?.VITE_API_BASE || 'http://localhost:8080')
  const [selectedOrg, setSelectedOrg] = useState(() => { try { return typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('org') || 'null') : null } catch (e) { return null } })
  useEffect(() => {
    function onOrgChanged(e){ const org = e?.detail || null; setSelectedOrg(org); try { if (org) localStorage.setItem('org', JSON.stringify(org)) } catch(err){} }
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
  const [issues, setIssues] = useState([])
  const [issuesLoading, setIssuesLoading] = useState(true)
  const [issuesError, setIssuesError] = useState('')
  const [sprints, setSprints] = useState([])
  const [sprintsLoading, setSprintsLoading] = useState(true)
  const [sprintsError, setSprintsError] = useState('')
  const [draggingIssueId, setDraggingIssueId] = useState(null)
  const [dragOverTarget, setDragOverTarget] = useState('')
  const [sprintActionId, setSprintActionId] = useState('')
  const [sprintActionError, setSprintActionError] = useState('')
  const [issueMoveError, setIssueMoveError] = useState('')

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
      return {
        ...issue,
        dbId: issue.id,
        displayKey: issue.issueKey || issue.key || issue.id,
        title: issue.summary || issue.title || 'Untitled issue',
        type: issueType,
        labels,
        points,
        assignee: issue.assigneeName || issue.assignee || issue.creatorName || 'Unassigned',
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

  async function createAndStartSprint() {
    const nextOrder = getNextSprintOrder()
    const sprintPayload = {
      projectKey: activeProjectKey,
      name: getNextSprintName(nextOrder),
      goal: activeProject?.name
        ? `Current sprint for ${activeProject.name}`
        : `Current sprint for ${activeProjectKey}`,
      order: nextOrder,
      status: 'active',
      startDate: new Date().toISOString().slice(0, 10)
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

  async function handleStartSprint() {
    if (!activeProjectKey || activeSprint || !canManageSprints) return
    setSprintActionError('')
    setSprintActionId(startSprintActionKey)
    try {
      const updated = plannedSprint?.id
        ? await submitSprintAction(plannedSprint, 'start')
        : await createAndStartSprint()
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
    } catch (err) {
      setSprintActionError(err.message || 'Failed to start sprint')
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
              <div className="avatar-icon"><FiUser size={20} /></div>
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
            <span>{activeProject.name}</span>
          </div>

          <div className="backlog-title-row">
            <h1>Backlog</h1>
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
                </div>
              </div>
              <button
                className="btn backlog-outline-btn"
                onClick={handleCompleteSprint}
                disabled={!activeSprint || !canManageSprints || isActionLoading(activeSprint?.id)}
              >
                {isActionLoading(activeSprint?.id) ? 'Completing...' : 'Complete Sprint'}
              </button>
            </div>

            {issuesLoading || sprintsLoading ? (
              <div className="backlog-empty-state">Loading sprint...</div>
            ) : !activeSprint ? (
              <div className="backlog-empty-state">No active sprint yet.</div>
            ) : activeSprintIssues.length === 0 ? (
              <div className="backlog-empty-state">No issues in this sprint</div>
            ) : (
              <div className="backlog-issue-list">
                {activeSprintIssues.map((issue) => (
                  <div
                    key={issueIdentity(issue)}
                    className={`backlog-issue-row ${draggingIssueId === issueIdentity(issue) ? 'is-dragging' : ''}`}
                    draggable={canManageSprints}
                    onDragStart={(event) => handleIssueDragStart(event, issue)}
                    onDragEnd={handleIssueDragEnd}
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
                      <span className="backlog-avatar">{getInitials(issue.assignee)}</span>
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
              </div>
              <button
                className="btn backlog-outline-btn"
                onClick={handleStartSprint}
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
                      <span className="backlog-avatar">{getInitials(issue.assignee)}</span>
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
              <h2>Backlog</h2>
              <p>{backlogIssues.length} issues - Drag issues to sprints to plan your work</p>
            </div>

            {issuesLoading || sprintsLoading ? (
              <div className="backlog-empty-state">Loading backlog...</div>
            ) : backlogIssues.length === 0 ? (
              <div className="backlog-empty-state">No issues in backlog</div>
            ) : (
              <div className="backlog-issue-list backlog-pool-list">
                {backlogIssues.map((issue) => (
                  <div
                    key={issueIdentity(issue)}
                    className={`backlog-issue-row backlog-pool-row ${draggingIssueId === issueIdentity(issue) ? 'is-dragging' : ''}`}
                    draggable={canManageSprints}
                    onDragStart={(event) => handleIssueDragStart(event, issue)}
                    onDragEnd={handleIssueDragEnd}
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
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>
        </section>
      </main>
    </div>
  )
}



