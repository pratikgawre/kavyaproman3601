import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate, useParams } from 'react-router-dom'
import './Dashboard.css'
import './Board.css'
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
  FiFilter,
  FiChevronDown,
  FiTag,
  FiX
} from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import useIssueNotifications from '../hooks/useIssueNotifications'

function getInitials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

const STATUS_COLUMNS = [
  { key: 'todo', title: 'To Do', tone: 'todo' },
  { key: 'progress', title: 'In Progress', tone: 'progress' },
  { key: 'review', title: 'In Review', tone: 'review' },
  { key: 'done', title: 'Done', tone: 'done' }
]

const normalizeStatus = (status) => {
  const normalized = (status || '').toLowerCase().trim()
  if (normalized === 'todo' || normalized === 'to-do') return 'todo'
  if (normalized === 'progress' || normalized === 'in-progress' || normalized === 'in progress') return 'progress'
  if (normalized === 'review' || normalized === 'in-review' || normalized === 'in review') return 'review'
  if (normalized === 'done' || normalized === 'completed') return 'done'
  return 'todo'
}

const normalizePriority = (priority, difficulty) => {
  const normalized = (priority || '').toLowerCase().trim()
  if (['critical', 'high', 'medium', 'low'].includes(normalized)) return normalized
  const diff = (difficulty || '').toLowerCase().trim()
  if (diff === 'high') return 'high'
  if (diff === 'low') return 'low'
  return 'medium'
}

const pointsFromDifficulty = (difficulty) => {
  const diff = (difficulty || '').toLowerCase().trim()
  if (diff === 'high') return 8
  if (diff === 'low') return 2
  return 5
}

const normalizeProjectKey = (value) => (value || '').trim().toUpperCase()
const normalizeRole = (role) => (role || '').trim().toLowerCase()

export default function Board() {
  const navigate = useNavigate()
  const location = useLocation()
  const { projectId } = useParams()
  const { user, clearUser } = useAuth()
  const [profileUser, setProfileUser] = useState(null)
  const currentUser = profileUser || user || {}
  const displayName = currentUser?.name || (currentUser?.email ? currentUser.email.split('@')[0] : 'Guest')
  const userEmail = (currentUser?.email || '').trim().toLowerCase()
  const isProjectManager = ['admin', 'project manager'].includes(normalizeRole(currentUser?.role))
  const isDeveloper = normalizeRole(currentUser?.role) === 'developer'
  const [selectedOrg, setSelectedOrg] = useState(() => { try { return typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('org') || 'null') : null } catch (e) { return null } })
  useEffect(() => {
    function onOrgChanged(e){ const org = e?.detail || null; setSelectedOrg(org); try { if (org) localStorage.setItem('org', JSON.stringify(org)) } catch(err){} }
    window.addEventListener('org:changed', onOrgChanged)
    return () => window.removeEventListener('org:changed', onOrgChanged)
  }, [])
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [topSearchText, setTopSearchText] = useState('')
  const createEmptyFilters = () => ({
    status: [],
    type: [],
    priority: [],
    assignee: [],
    label: []
  })
  const [showFilters, setShowFilters] = useState(false)
  const [selectedFilters, setSelectedFilters] = useState(createEmptyFilters)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false)
  const [showTypeDropdown, setShowTypeDropdown] = useState(false)
  const [issues, setIssues] = useState([])
  const [issuesLoading, setIssuesLoading] = useState(true)
  const [issuesError, setIssuesError] = useState('')
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
  const assigneeDropdownRef = useRef(null)
  const typeDropdownRef = useRef(null)
  const API_BASE = (import.meta?.env?.VITE_API_BASE || 'http://localhost:8080')
  const projectFromState = location.state?.project
  const projectKeyRaw = (projectFromState?.projectKey || projectFromState?.id || projectId || '').trim()
  const activeProjectKey = normalizeProjectKey(projectKeyRaw)
  const [projectDetails, setProjectDetails] = useState(null)
  const activeProject = projectFromState || projectDetails || {
    id: activeProjectKey || projectKeyRaw,
    name: projectKeyRaw || activeProjectKey || 'Project'
  }
  const activeFilterCount =
    selectedFilters.status.length +
    selectedFilters.type.length +
    selectedFilters.priority.length +
    selectedFilters.assignee.length +
    selectedFilters.label.length
  const issueQuery = useMemo(() => {
    const raw = new URLSearchParams(location.search).get('issue') || ''
    return raw.trim().toLowerCase()
  }, [location.search])

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

  useEffect(() => {
    if (!activeProjectKey || projectFromState) return
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
        const match = list.find((project) => {
          const key = normalizeProjectKey(project.projectKey || project.id || '')
          return key === activeProjectKey
        })
        setProjectDetails(match || null)
      })
      .catch(() => {
        setProjectDetails(null)
      })
      .finally(() => {})

    return () => controller.abort()
  }, [API_BASE, activeProjectKey, projectFromState])
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

  const visibleIssues = useMemo(() => {
    if (isProjectManager || !userEmail) return issues
    return (issues || []).filter((issue) => {
      const assigneeEmail = (issue?.assigneeEmail || issue?.assignee || issue?.creatorEmail || '').toLowerCase()
      return assigneeEmail && assigneeEmail === userEmail
    })
  }, [issues, isProjectManager, userEmail])

  const mappedIssues = useMemo(() => (
    (visibleIssues || []).map((issue) => {
      const issueTypeRaw = (issue.issueType || issue.type || 'task').toString()
      const issueType = issueTypeRaw.toLowerCase().trim() || 'task'
      const labels = Array.isArray(issue.labels) ? issue.labels : []
      const displayKey = issue.issueKey || issue.key || issue.id
      const title = issue.summary || issue.title || 'Untitled issue'
      const assignee = issue.assigneeName || issue.assignee || issue.creatorName || 'Unassigned'
      const assignedBy = issue.creatorName || issue.creatorEmail || 'Unknown'
      const points = Number.isFinite(issue.points) ? issue.points : pointsFromDifficulty(issue.difficulty)
      return {
        ...issue,
        dbId: issue.id,
        displayKey,
        title,
        type: issueType,
        typeLabel: issueType.toUpperCase(),
        labels,
        assignee,
        assignedBy,
        points,
        priority: normalizePriority(issue.priority, issue.difficulty),
        status: normalizeStatus(issue.status)
      }
    })
  ), [issues])

  const boardColumns = useMemo(() => (
    STATUS_COLUMNS.map((column) => ({
      ...column,
      issues: mappedIssues.filter((issue) => issue.status === column.key)
    }))
  ), [mappedIssues])

  const allAssignees = useMemo(() => (
    [...new Set(mappedIssues.map((issue) => issue.assignee).filter(Boolean))]
  ), [mappedIssues])
  const allTypes = useMemo(() => (
    [...new Set(mappedIssues.map((issue) => issue.type).filter(Boolean))]
  ), [mappedIssues])

  const allLabels = useMemo(() => (
    [...new Set(mappedIssues.flatMap((issue) => issue.labels || []))]
  ), [mappedIssues])

  const filteredColumns = useMemo(() => {
    const hasStatusFilter = selectedFilters.status.length > 0

    return boardColumns
      .filter((column) => !hasStatusFilter || selectedFilters.status.includes(column.key))
      .map((column) => ({
        ...column,
        issues: column.issues.filter((issue) => {
          const typeMatch = !selectedFilters.type.length || selectedFilters.type.includes(issue.type)
          const priorityMatch = !selectedFilters.priority.length || selectedFilters.priority.includes(issue.priority)
          const assigneeMatch = !selectedFilters.assignee.length || selectedFilters.assignee.includes(issue.assignee)
          const labelMatch = !selectedFilters.label.length || issue.labels.some((label) => selectedFilters.label.includes(label))
          const issueMatch =
            !issueQuery ||
            (issue.displayKey || '').toLowerCase().includes(issueQuery) ||
            (issue.title || '').toLowerCase().includes(issueQuery)
          return typeMatch && priorityMatch && assigneeMatch && labelMatch && issueMatch
        })
      }))
  }, [boardColumns, selectedFilters, issueQuery])

  useEffect(() => {
    const status = new URLSearchParams(location.search).get('status')
    if (!status) return
    const normalized = status.toLowerCase().trim()
    const validStatuses = ['todo', 'progress', 'review', 'done']
    if (!validStatuses.includes(normalized)) return
    setSelectedFilters((current) => ({ ...current, status: [normalized] }))
  }, [location.search])

  function handleLogout() {
    clearUser()
    navigate('/login', { replace: true })
  }

  useEffect(() => {
    function handleOutsideClick(event) {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false)
      }
      if (assigneeDropdownRef.current && !assigneeDropdownRef.current.contains(event.target)) {
        setShowAssigneeDropdown(false)
      }
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target)) {
        setShowTypeDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  useEffect(() => {
    if (!mobileSearchOpen) return
    const timeoutId = setTimeout(() => topSearchInputRef.current?.focus(), 0)
    return () => clearTimeout(timeoutId)
  }, [mobileSearchOpen])

  function toggleFilter(group, value) {
    setSelectedFilters((current) => {
      const exists = current[group].includes(value)
      return {
        ...current,
        [group]: exists
          ? current[group].filter((item) => item !== value)
          : [...current[group], value]
      }
    })
  }

  function clearAllFilters() {
    setSelectedFilters(createEmptyFilters())
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

  function formatTypeLabel(type) {
    if (!type) return ''
    return type.charAt(0).toUpperCase() + type.slice(1)
  }

  return (
    <div className="board-page-root dashboard-root d-flex">
      <aside className={`sidebar d-flex flex-column ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-top">
          <div className="brand d-flex align-items-center">
            <div className="brand-logo">KP</div>
            <div className="brand-name">KavyaProMan 360</div>
          </div>
        </div>

        <div className="org-switch mt-3 d-flex align-items-center gap-2">
          <div className="org-icon">{selectedOrg?.name ? selectedOrg.name.charAt(0) : 'K'}</div>
          <div className="org-info">
            <div className="org-name">{selectedOrg?.name || 'Kavya Technologies'}</div>
            <button className="switch-org-btn mt-1" onClick={() => navigate('/organization')} aria-label="Switch Organization">
              <span className="switch-left"><FiRepeat size={16} className="me-2" /></span>
              <span className="switch-text">Switch Organization</span>
              <FiArrowRight size={16} className="switch-arrow" />
            </button>
          </div>
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

      <main className={`content board-content flex-grow-1 p-4 ${collapsed ? 'with-topbar' : ''}`}>
        <header className="board-top-strip">
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
              <button
                className="btn create-issue-medium"
                onClick={() => navigate('/create-issue', { state: { projectKey: activeProjectKey, project: activeProject } })}
              >
                <FiPlus className="me-1" /> Create Issue
              </button>
            )}
          </div>
        </header>

        <section className="board-shell">
          <div className="board-breadcrumb">
            <button
              type="button"
              className="board-breadcrumb-link"
              onClick={() => navigate('/projects')}
            >
              Projects
            </button>
            <span className="board-breadcrumb-sep">/</span>
            <button
              type="button"
              className="board-breadcrumb-link current"
              onClick={() => navigate('/projects')}
            >
              {activeProject.name || activeProjectKey || 'Project'}
            </button>
          </div>

          <div className="board-title-row">
            <div>
            <h1>{activeProject.name || activeProjectKey || 'Project Board'}</h1>
            </div>
            <div className="board-title-actions">
            
              <button
                className="btn board-outline-btn"
                onClick={() => navigate(`/projects/${activeProjectKey}/backlog`, { state: { project: activeProject } })}
              >
                View Backlog
              </button>
              <button className="btn board-outline-btn" onClick={() => setShowFilters(true)}>
                <FiFilter size={15} /> More Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
              </button>
            </div>
          </div>

          <div className="board-filter-row">
            <div className="board-filter-dropdown" ref={assigneeDropdownRef}>
              <button className="board-filter-pill" type="button" onClick={() => {
                setShowAssigneeDropdown((value) => !value)
                setShowTypeDropdown(false)
              }}>
                <FiUsers size={15} />
                <span>{selectedFilters.assignee.length ? `${selectedFilters.assignee.length} assignee(s)` : 'All Assignees'}</span>
                <FiChevronDown size={15} />
              </button>
              {showAssigneeDropdown && (
                <div className="board-pill-dropdown">
                  <button
                    className="board-pill-item"
                    type="button"
                    onClick={() => {
                      setSelectedFilters((current) => ({ ...current, assignee: [] }))
                      setShowAssigneeDropdown(false)
                    }}
                  >
                    All Assignees
                  </button>
                  {allAssignees.map((assignee) => (
                    <label key={assignee} className="board-pill-item">
                      <input
                        type="checkbox"
                        checked={selectedFilters.assignee.includes(assignee)}
                        onChange={() => toggleFilter('assignee', assignee)}
                      />
                      <span>{assignee}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="board-filter-dropdown" ref={typeDropdownRef}>
              <button className="board-filter-pill" type="button" onClick={() => {
                setShowTypeDropdown((value) => !value)
                setShowAssigneeDropdown(false)
              }}>
                <FiTag size={15} />
                <span>{selectedFilters.type.length ? `${selectedFilters.type.length} type(s)` : 'All Types'}</span>
                <FiChevronDown size={15} />
              </button>
              {showTypeDropdown && (
                <div className="board-pill-dropdown">
                  <button
                    className="board-pill-item"
                    type="button"
                    onClick={() => {
                      setSelectedFilters((current) => ({ ...current, type: [] }))
                      setShowTypeDropdown(false)
                    }}
                  >
                    All Types
                  </button>
                  {allTypes.map((type) => (
                    <label key={type} className="board-pill-item">
                      <input
                        type="checkbox"
                        checked={selectedFilters.type.includes(type)}
                        onChange={() => toggleFilter('type', type)}
                      />
                      <span>{formatTypeLabel(type)}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {showFilters && (
            <div className="filters-modal-overlay" onClick={() => setShowFilters(false)}>
              <div className="filters-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
                <div className="filters-modal-header d-flex align-items-start">
                  <div>
                    <h5><FiFilter className="me-2" /> Board Filters</h5>
                    <p className="muted">Refine visible cards by status, type, assignee, priority, and labels.</p>
                  </div>
                  <button className="btn modal-close" onClick={() => setShowFilters(false)} aria-label="Close">
                    <FiX size={18} />
                  </button>
                </div>

                <div className="filters-body">
                  <div className="filters-grid">
                    <div className="filters-column">
                      <div className="filter-section">
                        <h6>Status</h6>
                        <div className="filter-list">
                          <label><input type="checkbox" checked={selectedFilters.status.includes('todo')} onChange={() => toggleFilter('status', 'todo')} /> To Do</label>
                          <label><input type="checkbox" checked={selectedFilters.status.includes('progress')} onChange={() => toggleFilter('status', 'progress')} /> In Progress</label>
                          <label><input type="checkbox" checked={selectedFilters.status.includes('review')} onChange={() => toggleFilter('status', 'review')} /> In Review</label>
                          <label><input type="checkbox" checked={selectedFilters.status.includes('done')} onChange={() => toggleFilter('status', 'done')} /> Done</label>
                        </div>
                      </div>

                      <div className="filter-section">
                        <h6>Issue Type</h6>
                        <div className="filter-list">
                          <label><input type="checkbox" checked={selectedFilters.type.includes('story')} onChange={() => toggleFilter('type', 'story')} /> Story</label>
                          <label><input type="checkbox" checked={selectedFilters.type.includes('task')} onChange={() => toggleFilter('type', 'task')} /> Task</label>
                          <label><input type="checkbox" checked={selectedFilters.type.includes('bug')} onChange={() => toggleFilter('type', 'bug')} /> Bug</label>
                        </div>
                      </div>
                    </div>

                    <div className="filters-column">
                      <div className="filter-section">
                        <h6>Priority</h6>
                        <div className="filter-list priority-list">
                          <label><input type="checkbox" checked={selectedFilters.priority.includes('critical')} onChange={() => toggleFilter('priority', 'critical')} /><span className="dot dot-red" /> Critical</label>
                          <label><input type="checkbox" checked={selectedFilters.priority.includes('high')} onChange={() => toggleFilter('priority', 'high')} /><span className="dot dot-orange" /> High</label>
                          <label><input type="checkbox" checked={selectedFilters.priority.includes('medium')} onChange={() => toggleFilter('priority', 'medium')} /><span className="dot dot-yellow" /> Medium</label>
                          <label><input type="checkbox" checked={selectedFilters.priority.includes('low')} onChange={() => toggleFilter('priority', 'low')} /><span className="dot dot-green" /> Low</label>
                        </div>
                      </div>

                      <div className="filter-section">
                        <h6>Assignee</h6>
                        <div className="filter-list">
                          {allAssignees.map((assignee) => (
                            <label key={assignee}>
                              <input type="checkbox" checked={selectedFilters.assignee.includes(assignee)} onChange={() => toggleFilter('assignee', assignee)} /> {assignee}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="divider" />

                  <div className="filter-section">
                    <h6>Labels</h6>
                    <div className="filter-list board-label-grid">
                      {allLabels.map((label) => (
                        <label key={label}>
                          <input type="checkbox" checked={selectedFilters.label.includes(label)} onChange={() => toggleFilter('label', label)} /> {label}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="filters-modal-footer d-flex align-items-center">
                  <button className="link-clear" onClick={clearAllFilters} type="button">Clear All Filters</button>
                  <div className="ms-auto d-flex gap-3">
                    <button className="btn btn-outline-secondary" onClick={() => setShowFilters(false)}>Close</button>
                    <button className="btn save-filter" onClick={() => setShowFilters(false)} type="button">Apply Filters</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="board-columns-scroll">
            {issuesLoading ? (
              <div className="board-empty-state">Loading issues...</div>
            ) : issuesError ? (
              <div className="board-empty-state">{issuesError}</div>
            ) : (
              <div className="board-columns-track">
                {filteredColumns.map((column) => (
                  <section key={column.key} className={`board-column board-column-${column.tone}`}>
                    <header className="board-column-head">
                      <div className="board-column-title-wrap">
                        <h2>{column.title}</h2>
                        <span className="board-column-count">{column.issues.length}</span>
                      </div>
                      {!isDeveloper && (
                        <button
                          className="board-column-add"
                          aria-label={`Add issue to ${column.title}`}
                          onClick={() => navigate('/create-issue', { state: { projectKey: activeProjectKey, project: activeProject } })}
                        >
                          <FiPlus size={18} />
                        </button>
                      )}
                    </header>

                    <div className="board-column-body">
                      {column.issues.map((issue) => (
                        <article key={issue.dbId || issue.displayKey} className={`board-issue-card board-priority-${issue.priority}`}>
                          <div className="board-issue-key-row">
                            <span className={`board-issue-type board-issue-${issue.type}`}>{issue.typeLabel}</span>
                            <span className="board-issue-key">{issue.displayKey}</span>
                          </div>

                          <h3>{issue.title}</h3>
                          <div className="board-issue-meta">
                            Assigned by: <span>{issue.assignedBy}</span>
                          </div>

                          <div className="board-issue-labels">
                            {issue.labels.map((label) => (
                              <span key={label} className="board-issue-label">{label}</span>
                            ))}
                          </div>

                          <div className="board-issue-footer">
                            <div className="board-issue-assignee">
                              <span className="board-issue-avatar" title={issue.assignee}>{getInitials(issue.assignee)}</span>
                              <span className="board-issue-assignee-name" title={issue.assignee}>{issue.assignee}</span>
                            </div>
                            <span className="board-issue-points">{issue.points} pts</span>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

