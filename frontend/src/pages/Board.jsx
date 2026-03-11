import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate, useParams } from 'react-router-dom'
import './Dashboard.css'
import './Board.css'
import { BOARD_COLUMNS } from '../data/boardColumns'
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

function getInitials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export default function Board() {
  const navigate = useNavigate()
  const location = useLocation()
  const { projectId } = useParams()
  const { user, clearUser } = useAuth()
  const displayName = user?.name || (user?.email ? user.email.split('@')[0] : 'Guest')
  const [selectedOrg, setSelectedOrg] = useState(() => { try { return typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('org') || 'null') : null } catch (e) { return null } })
  useEffect(() => {
    function onOrgChanged(e){ const org = e?.detail || null; setSelectedOrg(org); try { if (org) localStorage.setItem('org', JSON.stringify(org)) } catch(err){} }
    window.addEventListener('org:changed', onOrgChanged)
    return () => window.removeEventListener('org:changed', onOrgChanged)
  }, [])
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
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
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'KPM-5 moved to In Review', time: '2m ago', read: false },
    { id: 2, title: 'Sprint board updated with new tasks', time: '16m ago', read: false },
    { id: 3, title: 'Daily standup starts in 20 minutes', time: '1h ago', read: true }
  ])
  const notificationRef = useRef(null)
  const assigneeDropdownRef = useRef(null)
  const typeDropdownRef = useRef(null)
  const projectFromState = location.state?.project
  const activeProject = projectFromState || {
    id: projectId || 'KPM',
    name: 'KavyaProMan 360'
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
  const unreadCount = notifications.filter((item) => !item.read).length

  const allAssignees = useMemo(() => (
    [...new Set(BOARD_COLUMNS.flatMap((column) => column.issues.map((issue) => issue.assignee)))]
  ), [])
  const allTypes = useMemo(() => (
    [...new Set(BOARD_COLUMNS.flatMap((column) => column.issues.map((issue) => issue.type)))]
  ), [])

  const allLabels = useMemo(() => (
    [...new Set(BOARD_COLUMNS.flatMap((column) => column.issues.flatMap((issue) => issue.labels)))]
  ), [])

  const filteredColumns = useMemo(() => {
    const hasStatusFilter = selectedFilters.status.length > 0

    return BOARD_COLUMNS
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
            (issue.id || '').toLowerCase().includes(issueQuery) ||
            (issue.title || '').toLowerCase().includes(issueQuery)
          return typeMatch && priorityMatch && assigneeMatch && labelMatch && issueMatch
        })
      }))
  }, [selectedFilters, issueQuery])

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

  function markNotificationRead(id) {
    setNotifications((current) => current.map((item) => (item.id === id ? { ...item, read: true } : item)))
  }

  function markAllNotificationsRead() {
    setNotifications((current) => current.map((item) => ({ ...item, read: true })))
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
                <div className="user-role">{user?.role || 'Member'}</div>
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
          <div className="top-search-row">
            <div className="input-group top-search-medium">
              <span className="input-group-text"><FiSearch /></span>
              <input className="form-control" placeholder="Search issues, projects..." aria-label="Search issues and projects" />
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
                    {unreadCount > 0 && (
                      <button className="mark-all-btn" type="button" onClick={markAllNotificationsRead}>
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="notification-list">
                    {notifications.map((item) => (
                      <button
                        key={item.id}
                        className={`notification-item-row ${item.read ? 'read' : 'unread'}`}
                        onClick={() => markNotificationRead(item.id)}
                        type="button"
                      >
                        <div className="notification-title">{item.title}</div>
                        <div className="notification-time">{item.time}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button className="btn create-issue-medium" onClick={() => navigate('/create-issue')}>
              <FiPlus className="me-1" /> Create Issue
            </button>
          </div>
        </header>

        <section className="board-shell">
          <div className="board-breadcrumb">
            <span>Projects</span>
            <span>/</span>
            <span>{activeProject.name}</span>
          </div>

          <div className="board-title-row">
            <div>
              <h1>Sprint 2 - Board Implementation</h1>
            </div>
            <div className="board-title-actions">
            
              <button className="btn board-outline-btn" onClick={() => navigate(`/projects/${activeProject.id}/backlog`, { state: { project: activeProject } })}>View Backlog</button>
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
                    <div className="filter-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '10px' }}>
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
            <div className="board-columns-track">
              {filteredColumns.map((column) => (
                <section key={column.key} className={`board-column board-column-${column.tone}`}>
                  <header className="board-column-head">
                    <div className="board-column-title-wrap">
                      <h2>{column.title}</h2>
                      <span className="board-column-count">{column.issues.length}</span>
                    </div>
                    <button className="board-column-add" aria-label={`Add issue to ${column.title}`}>
                      <FiPlus size={18} />
                    </button>
                  </header>

                  <div className="board-column-body">
                    {column.issues.map((issue) => (
                      <article key={issue.id} className={`board-issue-card board-priority-${issue.priority}`}>
                        <div className="board-issue-key-row">
                          <span className={`board-issue-type board-issue-${issue.type}`}>{issue.typeLabel}</span>
                          <span className="board-issue-key">{issue.id}</span>
                        </div>

                        <h3>{issue.title}</h3>

                        <div className="board-issue-labels">
                          {issue.labels.map((label) => (
                            <span key={label} className="board-issue-label">{label}</span>
                          ))}
                        </div>

                        <div className="board-issue-footer">
                          <span className="board-issue-avatar" title={issue.assignee}>{getInitials(issue.assignee)}</span>
                          <span className="board-issue-points">{issue.points} pts</span>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

