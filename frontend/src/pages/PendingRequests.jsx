import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  FiArrowLeft,
  FiGrid,
  FiFolder,
  FiUsers,
  FiBarChart2,
  FiCreditCard,
  FiSettings,
  FiLogOut,
  FiMenu,
  FiRepeat,
  FiArrowRight,
  FiShield
} from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import { getInitials } from '../utils/initials'
import './Dashboard.css'
import './PendingRequests.css'

const summarizeStatus = (status) => {
  if (!status) return 'Pending'
  return status.toString().trim()
}

const formatDate = (value) => {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function PendingRequests() {
  const API_BASE = (import.meta && import.meta.env && import.meta.env.VITE_API_BASE) || 'http://localhost:8080'
  const navigate = useNavigate()
  const { user, clearUser } = useAuth()
  const userId = user?.id
  const displayName = user?.name || (user?.email ? user.email.split('@')[0] : 'Guest')
  const avatarInitials = getInitials(user?.name || displayName, user?.email)
  const avatar = user?.avatar || ''
  const isAdmin = (user?.role || '').toString().trim().toLowerCase() === 'admin'
  const [selectedOrg, setSelectedOrg] = useState(() => {
    try {
      return typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('org') || 'null') : null
    } catch {
      return null
    }
  })
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [pendingRequests, setPendingRequests] = useState({
    joinRequests: [],
    roleChangeRequests: [],
    projectRequests: []
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [requestNotes, setRequestNotes] = useState({})
  const [requestStatuses, setRequestStatuses] = useState({})

  useEffect(() => {
    function sync(e) {
      const detail = e.detail || {}
      if (typeof detail.collapsed === 'boolean') setCollapsed(detail.collapsed)
      if (typeof detail.open === 'boolean') setMobileOpen(detail.open)
    }
    window.addEventListener('sidebar:state', sync)
    return () => window.removeEventListener('sidebar:state', sync)
  }, [])

  useEffect(() => {
    function onOrgChanged(e) {
      const org = e?.detail || null
      setSelectedOrg(org)
      try { if (org) localStorage.setItem('org', JSON.stringify(org)) } catch { /* ignore storage write failures */ }
    }
    window.addEventListener('org:changed', onOrgChanged)
    return () => window.removeEventListener('org:changed', onOrgChanged)
  }, [])

  useEffect(() => {
    if (!isAdmin || !userId) {
      setPendingRequests({ joinRequests: [], roleChangeRequests: [], projectRequests: [] })
      setError(isAdmin ? '' : 'Administrator access is required to view pending requests.')
      setLoading(false)
      return
    }
    const controller = new AbortController()
    setLoading(true)
    setError('')
    fetch(`${API_BASE}/api/admin/pending-requests`, {
      signal: controller.signal,
      headers: { 'X-USER-ID': String(userId) }
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.text()
          throw new Error(err || res.statusText || 'Unable to load pending requests')
        }
        return res.json()
      })
      .then((data) => {
        setPendingRequests({
          joinRequests: Array.isArray(data?.joinRequests) ? data.joinRequests : [],
          roleChangeRequests: Array.isArray(data?.roleChangeRequests) ? data.roleChangeRequests : [],
          projectRequests: Array.isArray(data?.projectRequests) ? data.projectRequests : []
        })
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return
        setError(err?.message || 'Failed to load pending requests')
      })
      .finally(() => {
        setLoading(false)
      })
    return () => controller.abort()
  }, [API_BASE, isAdmin, userId])

  const handleRequestAction = async (cardId, label, action, type, extra = {}) => {
    if (!user?.id) {
      const message = 'Please sign in again to approve requests.'
      setActionMessage(message)
      setRequestNotes((prev) => ({ ...prev, [cardId]: message }))
      return
    }
    const payload = {
      action,
      projectId: extra.projectId || extra.projectKey,
      memberEmail: extra.memberEmail
    }
    try {
      const response = await fetch(`${API_BASE}/api/admin/pending-requests/${type}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-USER-ID': String(user.id)
        },
        body: JSON.stringify(payload)
      })
      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || 'Failed to update request')
      }
      const data = await response.json()
      const message = data?.message || `${label} marked as ${action}`
      setActionMessage(message)
      setRequestStatuses((prev) => ({ ...prev, [cardId]: action }))
    } catch (err) {
      const message = err?.message || 'Unable to perform action'
      setActionMessage(message)
      setRequestNotes((prev) => ({ ...prev, [cardId]: message }))
    }
  }

  function handleLogout() {
    clearUser()
    navigate('/login', { replace: true })
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

  const sidebarNav = [
    { to: '/dashboard', label: 'Dashboard', Icon: FiGrid },
    { to: '/projects', label: 'Projects', Icon: FiFolder },
    { to: '/teams', label: 'Teams', Icon: FiUsers },
    { to: '/reports', label: 'Reports', Icon: FiBarChart2 },
    { to: '/subscription', label: 'Subscription', Icon: FiCreditCard },
    { to: '/settings', label: 'Settings', Icon: FiSettings },
    { to: '/role-management', label: 'Role Management', Icon: FiShield }
  ]

  const managerName = (selectedOrg?.name || 'KavyaProMan').charAt(0)

  return (
    <div className="dashboard-root d-flex">
      <aside className={`sidebar d-flex flex-column ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-top">
          <div className="brand d-flex align-items-center">
            <div className="brand-logo">KP</div>
            <div className="brand-name">KavyaProMan 360</div>
          </div>
        </div>

        <div className="org-switch mt-3 d-flex align-items-center gap-2">
          <div className="org-icon">{managerName}</div>
          <div className="org-info">
            <div className="org-name">{selectedOrg?.name || 'Kavya Technologies'}</div>
            <button className="switch-org-btn mt-1" onClick={() => navigate('/organization')} aria-label="Switch Organization">
              <span className="switch-left">
                <FiRepeat size={16} className="me-2" />
              </span>
              <span className="switch-text">Switch Organization</span>
              <FiArrowRight size={16} className="switch-arrow" />
            </button>
          </div>
        </div>

        <div className="sidebar-inner d-flex flex-column mt-3">
          <div className="nav-scroll">
            <nav className="nav flex-column">
              {sidebarNav.map(({ to, label, Icon }) => {
                const IconComponent = Icon
                return (
                  <NavLink key={label} to={to} className={({ isActive }) => `nav-item d-flex align-items-center mb-2 ${isActive ? 'active' : ''}`}>
                    <IconComponent className="me-3 nav-icon" /> <span className="nav-text">{label}</span>
                  </NavLink>
                )
              })}
            </nav>
          </div>

          <div className="sidebar-footer mt-3 d-flex flex-column align-items-start">
            <div className="profile d-flex align-items-center w-100">
              <div className="avatar-icon">{avatar ? <img src={avatar} alt="avatar" /> : avatarInitials}</div>
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
            <div className="ms-2 brand-name">KavyaProMan</div>
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

      <main className={`content flex-grow-1 p-4 ${collapsed ? 'with-topbar' : ''}`}>
        <div className="pending-page">
          <div className="pending-header d-flex align-items-center justify-content-between flex-wrap gap-3">
            <div>
              <p className="muted mb-1">Pending queue</p>
              <h1>Pending requests</h1>
              <p className="muted mb-0">Review user join, role, and project creation requests before approving.</p>
            </div>
            <button className="btn admin-ghost-btn" type="button" onClick={() => navigate('/dashboard')}>
              <FiArrowLeft size={16} className="me-2" /> Back to dashboard
            </button>
          </div>

          {error && <div className="alert alert-danger">{error}</div>}
          {actionMessage && <div className="alert alert-info mb-3">{actionMessage}</div>}

          <section className="pending-section">
            <div className="pending-section-header">
              <div>
                <p className="muted mb-1">User join requests</p>
                <h3>Members awaiting approval</h3>
              </div>
              <span className="pending-section-count">{pendingRequests.joinRequests.length}</span>
            </div>
            <div className="pending-cards">
              {loading ? (
                <div className="pending-loading">Loading requests…</div>
              ) : pendingRequests.joinRequests.length === 0 ? (
                <div className="pending-empty">No user join requests at the moment.</div>
              ) : (
                pendingRequests.joinRequests.map((request) => {
                  const {
                    projectId,
                    memberEmail,
                    memberName,
                    projectName,
                    projectKey,
                    status
                  } = request || {}
                  const label = memberName || memberEmail || projectName || 'Member'
                  const cardId = `${projectId || 'join'}-${memberEmail || label}`
                  return (
                    <article key={`${cardId}-${Math.random()}`} className="pending-card">
                      <div className="pending-card-head">
                        <h4>{label}</h4>
                        <p>{memberEmail}</p>
                      </div>
                      <div className="pending-card-meta">
                        <span>{projectName || projectKey}</span>
                        <span className="pending-status">{summarizeStatus(status)}</span>
                      </div>
                      <div className="pending-card-actions">
                        <button
                          type="button"
                          className={`btn pending-btn approve-btn ${requestStatuses[cardId] === 'approved' ? 'approved' : ''}`}
                          onClick={() => handleRequestAction(cardId, label, 'approved', 'join', { projectId, memberEmail })}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="btn pending-btn reject-btn"
                          onClick={() => handleRequestAction(cardId, label, 'rejected', 'join', { projectId, memberEmail })}
                        >
                          Reject
                        </button>
                      </div>
                      {requestNotes[cardId] && <p className="pending-action-note">{requestNotes[cardId]}</p>}
                    </article>
                  )
                })
              )}
            </div>
          </section>

          <section className="pending-section">
            <div className="pending-section-header">
              <div>
                <p className="muted mb-1">Role change requests</p>
                <h3>Members requesting role updates</h3>
              </div>
              <span className="pending-section-count">{pendingRequests.roleChangeRequests.length}</span>
            </div>
            <div className="pending-cards">
              {loading ? (
                <div className="pending-loading">Loading requests…</div>
              ) : pendingRequests.roleChangeRequests.length === 0 ? (
                <div className="pending-empty">No role change requests right now.</div>
              ) : (
                pendingRequests.roleChangeRequests.map((request) => {
                  const {
                    projectId,
                    memberEmail,
                    memberName,
                    projectName,
                    projectKey,
                    status
                  } = request || {}
                  const label = memberName || memberEmail || 'Member'
                  const cardId = `${projectId || 'role'}-${memberEmail || label}`
                  return (
                    <article key={`${cardId}-${Math.random()}`} className="pending-card">
                      <div className="pending-card-head">
                        <h4>{label}</h4>
                        <p>{memberEmail}</p>
                      </div>
                      <div className="pending-card-meta">
                        <span>{projectName || projectKey}</span>
                        <span className="pending-status warning">{summarizeStatus(status)}</span>
                      </div>
                      <div className="pending-card-actions">
                        <button
                          type="button"
                          className={`btn pending-btn approve-btn ${requestStatuses[cardId] === 'approved' ? 'approved' : ''}`}
                          onClick={() => handleRequestAction(cardId, label, 'approved', 'role', { projectId, memberEmail })}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="btn pending-btn reject-btn"
                          onClick={() => handleRequestAction(cardId, label, 'rejected', 'role', { projectId, memberEmail })}
                        >
                          Reject
                        </button>
                      </div>
                      {requestNotes[cardId] && <p className="pending-action-note">{requestNotes[cardId]}</p>}
                    </article>
                  )
                })
              )}
            </div>
          </section>

          <section className="pending-section">
            <div className="pending-section-header">
              <div>
                <p className="muted mb-1">Project creation requests</p>
                <h3>New projects awaiting approval</h3>
              </div>
              <span className="pending-section-count">{pendingRequests.projectRequests.length}</span>
            </div>
            <div className="pending-cards">
              {loading ? (
                <div className="pending-loading">Loading requests…</div>
              ) : pendingRequests.projectRequests.length === 0 ? (
                <div className="pending-empty">No pending project creation requests.</div>
              ) : (
                pendingRequests.projectRequests.map((project) => {
                  const label = project.projectName || project.projectKey || 'Project'
                  const cardId = `${project.projectId || 'proj'}-${label}`
                  return (
                    <article key={`${cardId}-${Math.random()}`} className="pending-card">
                      <div className="pending-card-head">
                        <h4>{label}</h4>
                        <p>{project.projectKey}</p>
                      </div>
                      <div className="pending-card-meta">
                        <span>{project.managerName || project.managerEmail}</span>
                        <span>{formatDate(project.createdAt)}</span>
                      </div>
                        <div className="pending-card-actions">
                          <button
                            type="button"
                            className={`btn pending-btn approve-btn ${requestStatuses[cardId] === 'approved' ? 'approved' : ''}`}
                            onClick={() => handleRequestAction(cardId, label, 'approved', 'project', { projectId: project.projectId })}
                          >
                          Approve
                        </button>
                      </div>
                      {requestNotes[cardId] && <p className="pending-action-note">{requestNotes[cardId]}</p>}
                    </article>
                  )
                })
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
