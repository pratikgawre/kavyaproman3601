import { useEffect, useRef, useState } from 'react'
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
  FiZap
} from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'

const ACTIVE_SPRINT_ISSUES = [
  {
    id: 'KPM-2',
    type: 'story',
    title: 'Implement Kanban board with drag and drop',
    labels: ['frontend', 'core'],
    points: 13,
    assignee: 'Michael Chen'
  },
  {
    id: 'KPM-3',
    type: 'story',
    title: 'Add sprint planning interface',
    labels: ['frontend', 'sprints'],
    points: 5,
    assignee: 'Emily Rodriguez'
  },
  {
    id: 'KPM-4',
    type: 'bug',
    title: 'Bug: Filter not working on board view',
    labels: ['bug', 'frontend'],
    points: 2,
    assignee: 'Sarah Johnson'
  },
  {
    id: 'KPM-5',
    type: 'task',
    title: 'Setup authentication system',
    labels: ['backend', 'security'],
    points: 8,
    assignee: 'David Kim'
  },
  {
    id: 'KPM-9',
    type: 'task',
    title: 'Optimize database queries',
    labels: ['backend', 'performance'],
    points: 5,
    assignee: 'Michael Chen'
  }
]

const UPCOMING_BACKLOG_ISSUES = [
  {
    id: 'KPM-6',
    type: 'story',
    title: 'Create reporting dashboard',
    labels: ['frontend', 'analytics'],
    points: 13
  },
  {
    id: 'KPM-7',
    type: 'story',
    title: 'Implement notifications system',
    labels: ['backend', 'notifications'],
    points: 8
  },
  {
    id: 'KPM-8',
    type: 'spike',
    title: 'Add custom workflows',
    labels: ['core', 'workflows']
  }
]

function getInitials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
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
  const displayName = user?.name || (user?.email ? user.email.split('@')[0] : 'Guest')
  const [selectedOrg, setSelectedOrg] = useState(() => { try { return typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('org') || 'null') : null } catch (e) { return null } })
  useEffect(() => {
    function onOrgChanged(e){ const org = e?.detail || null; setSelectedOrg(org); try { if (org) localStorage.setItem('org', JSON.stringify(org)) } catch(err){} }
    window.addEventListener('org:changed', onOrgChanged)
    return () => window.removeEventListener('org:changed', onOrgChanged)
  }, [])
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'Sprint backlog updated with 2 new tasks', time: '2m ago', read: false },
    { id: 2, title: 'KPM-5 moved to In Review', time: '15m ago', read: false },
    { id: 3, title: 'Daily standup starts in 30 minutes', time: '1h ago', read: true }
  ])
  const notificationRef = useRef(null)
  const projectFromState = location.state?.project
  const activeProject = projectFromState || {
    id: projectId || 'KPM',
    name: 'KavyaProMan 360'
  }
  const unreadCount = notifications.filter((item) => !item.read).length

  useEffect(() => {
    function handleOutsideClick(event) {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  function handleLogout() {
    clearUser()
    navigate('/login', { replace: true })
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

  return (
    <div className="backlog-page-root dashboard-root d-flex">
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

      <main className={`content backlog-content flex-grow-1 p-4 ${collapsed ? 'with-topbar' : ''}`}>
        <header className="backlog-top-strip">
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

        <section className="backlog-shell">
          <div className="backlog-breadcrumb">
            <span>Projects</span>
            <span>/</span>
            <span>{activeProject.name}</span>
          </div>

          <div className="backlog-title-row">
            <h1>Backlog</h1>
            <div className="backlog-title-actions">
              <button className="btn backlog-outline-btn" onClick={() => navigate(`/projects/${activeProject.id}/board`, { state: { project: activeProject } })}>
                View Board
              </button>  
              
            </div>
          </div>

          <article className="backlog-sprint-card">
            <div className="backlog-sprint-head">
              <div className="backlog-sprint-left">
                <span className="backlog-sprint-icon"><FiPlayCircle size={18} /></span>
                <div>
                  <div className="backlog-sprint-title-row">
                    <h2>Sprint 2 - Board Implementation</h2>
                    <span className="backlog-active-pill">ACTIVE</span>
                  </div>
                  <p>Implement Kanban board and drag-and-drop functionality</p>
                </div>
              </div>
              <button className="btn backlog-outline-btn">Complete Sprint</button>
            </div>

            <div className="backlog-issue-list">
              {ACTIVE_SPRINT_ISSUES.map((issue) => (
                <div key={issue.id} className="backlog-issue-row">
                  <div className="backlog-issue-main">
                    <span className={`backlog-issue-type backlog-type-${issue.type}`}>
                      {renderIssueIcon(issue.type)}
                    </span>
                    <span className="backlog-issue-key">{issue.id}</span>
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
          </article>

          <article className="backlog-next-sprint-card">
            <div className="backlog-next-sprint-head">
              <div>
                <h2>Sprint 3 - Advanced Features</h2>
                <p>Add reporting, analytics, and automation</p>
              </div>
              <button className="btn backlog-outline-btn">Start Sprint</button>
            </div>
            <div className="backlog-empty-state">
              No issues in this sprint
            </div>
          </article>

          <article className="backlog-pool-card">
            <div className="backlog-pool-head">
              <h2>Backlog</h2>
              <p>{UPCOMING_BACKLOG_ISSUES.length} issues • Drag issues to sprints to plan your work</p>
            </div>

            <div className="backlog-issue-list backlog-pool-list">
              {UPCOMING_BACKLOG_ISSUES.map((issue) => (
                <div key={issue.id} className="backlog-issue-row backlog-pool-row">
                  <div className="backlog-issue-main">
                    <span className={`backlog-issue-type backlog-type-${issue.type}`}>
                      {renderIssueIcon(issue.type)}
                    </span>
                    <span className="backlog-issue-key">{issue.id}</span>
                    <span className="backlog-issue-title">{issue.title}</span>
                  </div>
                  <div className="backlog-issue-meta">
                    {issue.labels.map((label) => (
                      <span key={label} className="backlog-label-pill">{label}</span>
                    ))}
                    {issue.points ? <span className="backlog-points-pill">{issue.points} pts</span> : null}
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>
      </main>
    </div>
  )
}
