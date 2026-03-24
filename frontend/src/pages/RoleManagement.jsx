import { useEffect, useMemo, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  FiArrowLeft,
  FiShield,
  FiCheckCircle,
  FiAlertCircle,
  FiGrid,
  FiFolder,
  FiUsers,
  FiBarChart2,
  FiCreditCard,
  FiSettings,
  FiLogOut,
  FiMenu,
  FiRepeat,
  FiArrowRight
} from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import { getInitials } from '../utils/initials'
import './Dashboard.css'
import './RoleManagement.css'

const BASE_ROLE_OPTIONS = [
  'Admin',
  'Project Manager',
  'Developer',
  'Tester',
  'Business Analyst',
  'Member'
]

function normalizeRole(role) {
  return (role || '').toString().trim().toLowerCase()
}

export default function RoleManagement() {
  const API_BASE = (import.meta && import.meta.env && import.meta.env.VITE_API_BASE) || 'http://localhost:8080'
  const navigate = useNavigate()
  const { user, clearUser } = useAuth()
  const userId = user?.id
  const isAdmin = normalizeRole(user?.role) === 'admin'
  const displayName = user?.name || (user?.email ? user.email.split('@')[0] : 'Guest')
  const avatarInitials = getInitials(user?.name || displayName, user?.email)
  const avatar = user?.avatar || ''
  const [selectedOrg, setSelectedOrg] = useState(() => {
    try {
      return typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('org') || 'null') : null
    } catch {
      return null
    }
  })
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    function sync(e) {
      const d = e.detail || {}
      if (typeof d.collapsed === 'boolean') setCollapsed(d.collapsed)
      if (typeof d.open === 'boolean') setMobileOpen(d.open)
    }
    window.addEventListener('sidebar:state', sync)
    return () => window.removeEventListener('sidebar:state', sync)
  }, [])

  useEffect(() => {
    function onOrgChanged(e) {
      const org = e?.detail || null
      setSelectedOrg(org)
      try {
        if (org) localStorage.setItem('org', JSON.stringify(org))
      } catch {}
    }
    window.addEventListener('org:changed', onOrgChanged)
    return () => window.removeEventListener('org:changed', onOrgChanged)
  }, [])

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

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedRoles, setSelectedRoles] = useState({})
  const [updating, setUpdating] = useState({})
  const [statusMessages, setStatusMessages] = useState({})

  const uniqueRoleOptions = useMemo(() => {
    const set = new Set()
    BASE_ROLE_OPTIONS.forEach((role) => set.add(role))
    users.forEach((usr) => {
      if (usr?.role && usr.role.toString().trim()) {
        set.add(usr.role.toString().trim())
      }
    })
    return Array.from(set)
  }, [users])

  useEffect(() => {
    if (!isAdmin || !userId) {
      setUsers([])
      setError(isAdmin ? '' : 'Administrator access is required to use this page.')
      setLoading(false)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setError('')

    fetch(`${API_BASE}/api/admin/users?limit=100`, {
      signal: controller.signal,
      headers: {
        'X-USER-ID': String(userId)
      }
    })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text()
          throw new Error(text || res.statusText || 'Unable to load users')
        }
        return res.json()
      })
      .then((data) => {
        const payload = Array.isArray(data) ? data : []
        setUsers(payload)
        const initialRoles = {}
        payload.forEach((contact) => {
          if (contact?.id) {
            initialRoles[contact.id] = contact.role || 'Member'
          }
        })
        setSelectedRoles(initialRoles)
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return
        setUsers([])
        setError(err?.message || 'Unable to load member list')
      })
      .finally(() => {
        setLoading(false)
      })

    return () => controller.abort()
  }, [API_BASE, isAdmin, userId])

  const handleRoleSelect = (userKey, nextRole) => {
    setSelectedRoles((prev) => ({
      ...prev,
      [userKey]: nextRole
    }))
    setStatusMessages((prev) => ({
      ...prev,
      [userKey]: undefined
    }))
  }

  const handleSaveRole = async (targetUser) => {
    if (!targetUser?.id) return
    const targetId = targetUser.id
    const newRole = (selectedRoles[targetId] || '').toString().trim()
    const currentRole = (targetUser.role || '').toString().trim()
    if (!newRole) {
      setStatusMessages((prev) => ({
        ...prev,
        [targetId]: { type: 'error', text: 'Select a valid role before saving.' }
      }))
      return
    }
    if (newRole === currentRole) {
      setStatusMessages((prev) => ({
        ...prev,
        [targetId]: { type: 'info', text: 'This member already has that role.' }
      }))
      return
    }
    setUpdating((prev) => ({ ...prev, [targetId]: true }))
    setStatusMessages((prev) => ({
      ...prev,
      [targetId]: { type: 'info', text: 'Saving…' }
    }))

    try {
      const response = await fetch(`${API_BASE}/api/admin/users/${targetId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-USER-ID': String(userId)
        },
        body: JSON.stringify({ role: newRole })
      })
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || response.statusText || 'Unable to update role')
      }
      const updatedUser = await response.json()
      setUsers((prev) => prev.map((row) => (row.id === updatedUser.id ? updatedUser : row)))
      setSelectedRoles((prev) => ({
        ...prev,
        [targetId]: updatedUser.role || 'Member'
      }))
      setStatusMessages((prev) => ({
        ...prev,
        [targetId]: { type: 'success', text: 'Role updated successfully' }
      }))
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('role:updated', { detail: { user: updatedUser } }))
      }
    } catch (err) {
      setStatusMessages((prev) => ({
        ...prev,
        [targetId]: { type: 'error', text: err?.message || 'Unable to update role' }
      }))
    } finally {
      setUpdating((prev) => {
        const next = { ...prev }
        delete next[targetId]
        return next
      })
    }
  }

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
          <div className="org-icon">{selectedOrg?.name ? selectedOrg.name.charAt(0) : 'K'}</div>
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
              <NavLink to="/role-management" className={({ isActive }) => `nav-item d-flex align-items-center mb-2 ${isActive ? 'active' : ''}`}>
                <FiShield className="me-3 nav-icon" /> <span className="nav-text">Role Management</span>
              </NavLink>
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
        <div className="role-management-page">
          <div className="role-management-header">
            <button type="button" onClick={() => navigate('/dashboard')} className="role-back-button">
              <FiArrowLeft aria-hidden="true" /> Back to Dashboard
            </button>
            <div>
              <p className="role-management-label">
                <FiShield className="label-icon" aria-hidden="true" /> Role Management
              </p>
              <h1>Manage member roles</h1>
              <p className="role-management-subtitle">
                Assign project permissions to team members across every organization. Only admins can change roles.
              </p>
            </div>
          </div>

          {!isAdmin ? (
            <div className="role-management-alert role-management-alert-warning">
              You must be assigned an administrator role to view this screen.
            </div>
          ) : (
            <section className="role-management-content">
              {error && <div className="role-management-alert role-management-alert-error">{error}</div>}
              <ul className="role-management-grid" role="list">
                {users.map((member) => {
                  const memberKey = member.id || member.email || Math.random().toString()
                  const status = statusMessages[member.id]
                  const nextOptions = selectedRoles[member.id] ?? member.role ?? 'Member'
                  return (
                    <li key={`role-${memberKey}`} className="role-card" role="listitem">
                      <div className="role-card-head">
                        <p className="role-card-name">{member.name || member.email}</p>
                        <p className="role-card-email">{member.email}</p>
                      </div>
                      <div className="role-card-body">
                        <label className="role-card-select">
                          <span className="role-card-select-label">Role</span>
                          <select
                            value={nextOptions}
                            onChange={(event) => handleRoleSelect(member.id, event.target.value)}
                            disabled={!!updating[member.id]}
                          >
                            {uniqueRoleOptions.map((roleOption) => (
                              <option key={`${memberKey}-${roleOption}`} value={roleOption}>
                                {roleOption}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button
                          type="button"
                          className="role-save-button"
                          onClick={() => handleSaveRole(member)}
                          disabled={!!updating[member.id]}
                        >
                          {updating[member.id] ? 'Saving…' : 'Save role'}
                        </button>
                      </div>
                      {status && (
                        <div className={`role-card-message role-card-message-${status.type}`}>
                          <span aria-hidden="true">
                            {status.type === 'success' && <FiCheckCircle />}
                            {status.type === 'error' && <FiAlertCircle />}
                          </span>
                          <span>{status.text}</span>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
              {loading && <div className="role-management-loading">Loading team members…</div>}
              {!loading && users.length === 0 && !error && (
                <div className="role-management-empty">No members available yet.</div>
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  )
}
