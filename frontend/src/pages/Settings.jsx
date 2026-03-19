
import React, { useMemo, useState, useEffect, useRef } from 'react'
import {
  FiGrid,
  FiFolder,
  FiUsers,
  FiUser,
  FiBarChart2,
  FiCreditCard,
  FiSettings,
  FiLogOut,
  FiMenu,
  FiRepeat,
  FiArrowRight,
  FiLock,
  FiSearch,
  FiBell,
  FiPlus,
  FiMonitor,
  FiShield,
  FiX,
  FiChevronDown
} from 'react-icons/fi'
import './Settings.css'
import './Dashboard.css'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import useIssueNotifications from '../hooks/useIssueNotifications'
import { uploadFile } from '../utils/upload'
import API_BASE from '../config/api'

const stripLeadingSpace = (value) => value.replace(/^\s+/, '')
const sanitizeEmail = (value) => stripLeadingSpace(value).replace(/[^A-Za-z0-9@.]/g, '')
const preventLeadingSpace = (e) => {
  if (e.key === ' ' && (e.currentTarget.selectionStart ?? 0) === 0) e.preventDefault()
}
const ALPHABETIC_NAME_REGEX = /^\p{L}+(?:\s+\p{L}+)*$/u
const getAvatarInitials = (name, email) => {
  const source = (name || '').trim() || (email || '').trim()
  if (!source) return 'G'
  const parts = source.split(/[\s._-]+/).filter(Boolean)
  if (parts.length === 0) return source.charAt(0).toUpperCase()
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase()
}
const REGISTRATION_ROLE_OPTIONS = ['Admin', 'Project Manager', 'Developer', 'Tester', 'Business Analyst']
const COMMON_TIMEZONE_OPTIONS = [
  'UTC',
  'Asia/Kolkata',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney'
]

function SettingsSectionHeader({ icon: Icon, title, subtitle, children }) {
  return (
    <div className="card-header">
      <div className="settings-title-with-icon">
        <Icon className="settings-section-icon" aria-hidden="true" />
        <div className="settings-title-copy">
          <h2>{title}</h2>
          {subtitle && <p className="text-muted">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  )
}

export default function Settings() {
  // basic UI state
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')
  const [showNotifications, setShowNotifications] = useState(false)
  const [topSearchText, setTopSearchText] = useState('')

  // router helper
  const navigate = useNavigate()

  // placeholders for values that would normally come from context or props
  const [selectedOrg, setSelectedOrg] = useState(() => { try { return typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('org') || 'null') : null } catch (e) { return null } })
  useEffect(() => {
    function onOrgChanged(e){ const org = e?.detail || null; setSelectedOrg(org); try { if (org) localStorage.setItem('org', JSON.stringify(org)) } catch(err){} }
    window.addEventListener('org:changed', onOrgChanged)
    return () => window.removeEventListener('org:changed', onOrgChanged)
  }, [])

  // sync sidebar state from global controller
  useEffect(() => {
    function sync(e){
      const d = e.detail || {}
      if (typeof d.collapsed === 'boolean') setCollapsed(d.collapsed)
      if (typeof d.open === 'boolean') setMobileOpen(d.open)
    }
    window.addEventListener('sidebar:state', sync)
    return () => window.removeEventListener('sidebar:state', sync)
  }, [])

  const { user, clearUser } = useAuth()
  const {
    notifications,
    unreadCount,
    loading: notificationsLoading,
    error: notificationsError,
    markAsRead: markNotificationAsRead,
    markAllAsRead,
    dismissNotification,
    clearAllNotifications,
    refreshNotifications
  } = useIssueNotifications({ limit: 6 })
  const displayName = user?.name || (user?.email ? user.email.split('@')[0] : 'Guest')
  const avatarInitials = getAvatarInitials(user?.name, user?.email)
  const notificationRef = useRef(null)
  const topSearchInputRef = useRef(null)

  function toggleSidebarForScreen() {
    setCollapsed((prev) => {
      const next = !prev
      if (typeof window !== 'undefined' && window.innerWidth < 992) {
        setMobileOpen(!next)
      }
      return next
    })
  }

  const handleLogout = () => {
    clearUser()
    navigate('/login', { replace: true })
  }

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
    if (!mobileSearchOpen) return undefined
    const timeoutId = setTimeout(() => topSearchInputRef.current?.focus(), 0)
    return () => clearTimeout(timeoutId)
  }, [mobileSearchOpen])

  const isMobileScreen = () => typeof window !== 'undefined' && window.innerWidth <= 768

  const runIssueSearch = () => {
    const query = (topSearchText || '').trim()
    if (!query) {
      navigate('/all-my-issues')
      return
    }
    navigate(`/all-my-issues?q=${encodeURIComponent(query)}`)
  }

  const handleTopSearchIconClick = (event) => {
    event.preventDefault()
    event.stopPropagation()

    if (isMobileScreen() && !mobileSearchOpen) {
      setMobileSearchOpen(true)
      return
    }

    runIssueSearch()
  }

  return (
    <div className="dashboard-root d-flex">
      <aside className={`sidebar d-flex flex-column ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-top">
          <div className="brand d-flex align-items-center">
            <div className="brand-logo">KP</div>
            <div className="brand-name">KavyaProMan 360</div>
          </div>
          {/* <button className="btn btn-sm btn-link toggle-btn" onClick={() => setCollapsed(s => !s)} aria-label="Toggle sidebar">
            <FiMenu size={18} />
          </button> */}
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
              <NavLink to="/dashboard" className={({isActive})=> `nav-item d-flex align-items-center mb-2 ${isActive? 'active':''}`}>
                <FiGrid className="me-3 nav-icon"/> <span className="nav-text">Dashboard</span>
              </NavLink>
              <NavLink to="/projects" className={({isActive})=> `nav-item d-flex align-items-center mb-2 ${isActive? 'active':''}`}>
                <FiFolder className="me-3 nav-icon"/> <span className="nav-text">Projects</span>
              </NavLink>
              <NavLink to="/teams" className={({isActive})=> `nav-item d-flex align-items-center mb-2 ${isActive? 'active':''}`}>
                <FiUsers className="me-3 nav-icon"/> <span className="nav-text">Teams</span>
              </NavLink>
              <NavLink to="/reports" className={({isActive})=> `nav-item d-flex align-items-center mb-2 ${isActive? 'active':''}`}>
                <FiBarChart2 className="me-3 nav-icon"/> <span className="nav-text">Reports</span>
              </NavLink>
              <NavLink to="/subscription" className={({isActive})=> `nav-item d-flex align-items-center mb-2 ${isActive? 'active':''}`}>
                <FiCreditCard className="me-3 nav-icon"/> <span className="nav-text">Subscription</span>
              </NavLink>
              <NavLink to="/settings" className={({isActive})=> `nav-item d-flex align-items-center mb-2 ${isActive? 'active':''}`}>
                <FiSettings className="me-3 nav-icon"/> <span className="nav-text">Settings</span>
              </NavLink>
            </nav>
          </div>

          <div className="sidebar-footer mt-3 d-flex flex-column align-items-start">
            <div className="profile d-flex align-items-center w-100">
              <div className="avatar-icon">
                {user?.avatar ? <img src={user.avatar} alt="avatar" /> : avatarInitials}
              </div>
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

      {/* topbar shown when sidebar is collapsed: brand left, toggle right */}
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

      {/* mobile toggle (visible on small/medium screens) */}
      <button className="mobile-toggle btn btn-sm" aria-label="Toggle sidebar" onClick={toggleSidebarForScreen}>
        <FiMenu size={18} />
      </button>

      <div className={`mobile-overlay ${mobileOpen ? 'show' : ''}`} onClick={() => { setMobileOpen(false); setCollapsed(true) }} />

            {/*sidebar end  */}

      <main className={`content flex-grow-1 p-4 settings-page ${collapsed ? 'with-topbar' : ''}`}>
        <header className="dash-header mb-4">
          <div className={`top-search-row mb-3 ${mobileSearchOpen ? 'mobile-search-open' : ''}`}>
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
                value={topSearchText}
                onChange={(e) => setTopSearchText(e.target.value)}
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
                  className="settings-search-close"
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
              <button
                className={`btn btn-link bell-black ${unreadCount > 0 ? 'has-unread' : ''}`}
                title="Notifications"
                onClick={() => setShowNotifications((prev) => !prev)}
                type="button"
              >
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
                          <button className="mark-all-btn" type="button" onClick={markAllAsRead}>
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
                          markNotificationAsRead(item.id)
                          setShowNotifications(false)
                          if (item.href) navigate(item.href)
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            markNotificationAsRead(item.id)
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

            <button className="btn create-issue-medium" onClick={() => navigate('/create-issue')} type="button">
              <FiPlus className="me-1" /> Create Issue
            </button>
          </div>

          <h1>Settings</h1>
          <p className="text-muted">Manage your account and application preferences</p>
        </header>

        <div className="settings-tabs-container mb-4">
          <div className="settings-tabs">
            <button
              className={`tab-pill ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              Profile
            </button>
            <button
              className={`tab-pill ${activeTab === 'notifications' ? 'active' : ''}`}
              onClick={() => setActiveTab('notifications')}
            >
              Notifications
            </button>
            <button
              className={`tab-pill ${activeTab === 'appearance' ? 'active' : ''}`}
              onClick={() => setActiveTab('appearance')}
            >
              Appearance
            </button>
            <button
              className={`tab-pill ${activeTab === 'security' ? 'active' : ''}`}
              onClick={() => setActiveTab('security')}
            >
              Security
            </button>
          </div>
        </div>

        <div className="settings-content">
          {activeTab === 'profile' && <ProfileSection />}
          {activeTab === 'notifications' && <NotificationsSection onPreferencesSaved={refreshNotifications} />}
          {activeTab === 'appearance' && <AppearanceSection />}
          {activeTab === 'security' && <SecuritySection apiBase={API_BASE} />}
        </div>
      </main>
    </div>
  )
}

// ============ Profile Section ============
function ProfileSection() {
  const { user, setUser } = useAuth()
  const [formData, setFormData] = useState(() => {
    const fullName = (user?.name || '').trim()
    const nameParts = fullName ? fullName.split(/\s+/) : []

    return {
      firstName: nameParts[0] || '',
      lastName: nameParts.slice(1).join(' ') || '',
      email: user?.email || '',
      role: user?.role || 'Member',
      timezone: user?.timezone || 'UTC'
    }
  })
  const roleOptions = formData.role && !REGISTRATION_ROLE_OPTIONS.includes(formData.role)
    ? [formData.role, ...REGISTRATION_ROLE_OPTIONS]
    : REGISTRATION_ROLE_OPTIONS
  const timezoneOptions = formData.timezone && !COMMON_TIMEZONE_OPTIONS.includes(formData.timezone)
    ? [formData.timezone, ...COMMON_TIMEZONE_OPTIONS]
    : COMMON_TIMEZONE_OPTIONS
  const [avatar, setAvatar] = useState(user?.avatar || '')
  const [showAvatarViewer, setShowAvatarViewer] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileFieldErrors, setProfileFieldErrors] = useState({ firstName: '', lastName: '' })
  const fileInputRef = useRef(null)

  function getNameFieldError(fieldName, value) {
    const trimmedValue = stripLeadingSpace((value || '').toString()).trim()
    if (!trimmedValue) return ''
    const label = fieldName === 'lastName' ? 'Last name' : 'First name'
    return ALPHABETIC_NAME_REGEX.test(trimmedValue)
      ? ''
      : `${label} should contain only alphabetic characters`
  }

  function getProfileNameErrors(values) {
    return {
      firstName: getNameFieldError('firstName', values?.firstName),
      lastName: getNameFieldError('lastName', values?.lastName)
    }
  }

  useEffect(() => {
    let cancelled = false

    async function loadProfile() {
      if (!user?.id) return
      setProfileError('')
      setProfileLoading(true)
      try {
        const res = await fetch(`${API_BASE}/api/user`, {
          headers: { 'X-USER-ID': String(user.id) }
        })
        const body = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(body.message || 'Failed to load profile')
        if (cancelled) return

        const fullName = (body?.name || '').trim()
        const nameParts = fullName ? fullName.split(/\s+/) : []

        const nextFormData = {
          firstName: nameParts[0] || '',
          lastName: nameParts.slice(1).join(' ') || '',
          email: body?.email || '',
          role: body?.role || 'Member',
          timezone: body?.timezone || 'UTC'
        }

        setFormData(nextFormData)
        setProfileFieldErrors(getProfileNameErrors(nextFormData))
        setAvatar(body?.avatar || '')

        setUser({
          ...(user || {}),
          id: body?.id || user.id,
          name: body?.name,
          email: body?.email,
          avatar: body?.avatar,
          role: body?.role,
          timezone: body?.timezone
        })
      } catch (err) {
        if (!cancelled) setProfileError(err.message || 'Failed to load profile')
      } finally {
        if (!cancelled) setProfileLoading(false)
      }
    }

    loadProfile()
    return () => { cancelled = true }
  }, [setUser, user?.id])

  const handleChange = (e) => {
    const { name, value } = e.target
    const nextValue = name === 'email' ? sanitizeEmail(value) : stripLeadingSpace(value)
    setFormData(prev => ({ ...prev, [name]: nextValue }))
    if (name === 'firstName' || name === 'lastName') {
      setProfileFieldErrors(prev => ({ ...prev, [name]: getNameFieldError(name, nextValue) }))
    }
    setProfileError('')
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  async function saveProfile({ nextAvatar } = {}) {
    if (!user?.id) throw new Error('Please login again.')

    const nextFieldErrors = getProfileNameErrors(formData)
    setProfileFieldErrors(nextFieldErrors)
    if (nextFieldErrors.firstName || nextFieldErrors.lastName) {
      throw new Error('Please correct the highlighted name fields.')
    }

    const normalizedFirstName = stripLeadingSpace(formData.firstName).trim()
    const normalizedLastName = stripLeadingSpace(formData.lastName).trim()
    let name = [normalizedFirstName, normalizedLastName].filter(Boolean).join(' ')
    let email = (formData.email || '').trim()
    let role = (formData.role || '').trim() || 'Member'
    let timezone = (formData.timezone || '').trim() || 'UTC'
    let avatarToSave = nextAvatar !== undefined ? nextAvatar : avatar

    if (!name || !email) {
      const res = await fetch(`${API_BASE}/api/user`, {
        headers: { 'X-USER-ID': String(user.id) }
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.message || 'Failed to load profile')
      if (!name) name = (body?.name || '').trim()
      if (!email) email = (body?.email || '').trim()
      if (role === 'Member' && body?.role) role = body.role
      if (timezone === 'UTC' && body?.timezone) timezone = body.timezone
      if (avatarToSave === undefined) avatarToSave = body?.avatar || ''
    }

    if (!name) throw new Error('Name is required')
    if (!email) throw new Error('Email is required')

    const res = await fetch(`${API_BASE}/api/user`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-USER-ID': String(user.id)
      },
      body: JSON.stringify({
        name,
        email,
        avatar: avatarToSave ?? '',
        role,
        timezone
      })
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.message || 'Failed to save profile')

    const savedName = ((body?.name ?? name) || '').trim()
    const savedParts = savedName ? savedName.split(/\s+/) : []
    const nextSavedFormData = {
      firstName: savedParts[0] || '',
      lastName: savedParts.slice(1).join(' ') || '',
      email: body?.email ?? email,
      role: body?.role ?? role,
      timezone: body?.timezone ?? timezone
    }

    setFormData(nextSavedFormData)
    setProfileFieldErrors(getProfileNameErrors(nextSavedFormData))
    setAvatar(body?.avatar ?? avatarToSave ?? '')
    setUser({ ...(user || {}), ...body })

    return body
  }

  const handleAvatarUpload = async (e) => {
    const input = e.target
    const file = input.files?.[0]
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      alert('Please upload JPG, PNG, or GIF image only.')
      input.value = ''
      return
    }

    const maxSize = 2 * 1024 * 1024
    if (file.size > maxSize) {
      alert('Image size must be less than 2MB.')
      input.value = ''
      return
    }

    setProfileError('')
    setAvatarUploading(true)
    try {
      const uploaded = await uploadFile(file, { folder: 'avatars' })
      const nextAvatar = uploaded?.url ? String(uploaded.url) : ''
      if (!nextAvatar) throw new Error('Avatar upload failed')
      setAvatar(nextAvatar)
      await saveProfile({ nextAvatar })
      alert('Avatar uploaded successfully!')
    } catch (err) {
      alert(err.message || 'Avatar upload failed')
    } finally {
      setAvatarUploading(false)
      input.value = ''
    }
  }

  const handleAvatarPreview = () => {
    if (!avatar) return
    setShowAvatarViewer(true)
  }

  const handleRemoveAvatar = async () => {
    setProfileError('')
    setAvatar('')
    setShowAvatarViewer(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
    try {
      await saveProfile({ nextAvatar: '' })
      alert('Avatar removed successfully!')
    } catch (err) {
      alert(err.message || 'Failed to remove avatar')
    }
  }

  const handleSave = async () => {
    setProfileError('')
    setProfileSaving(true)
    try {
      await saveProfile()
      alert('Profile changes saved successfully!')
    } catch (err) {
      setProfileError(err.message || 'Failed to save profile')
      alert(err.message || 'Failed to save profile')
    } finally {
      setProfileSaving(false)
    }
  }

  return (
    <div className="settings-card">
      <SettingsSectionHeader
        icon={FiUser}
        title="Profile Settings"
        subtitle="Manage your personal information"
      >
        {profileError && <div className="text-danger small mt-2">{profileError}</div>}
        {profileLoading && <div className="text-muted small mt-2">Loading profile...</div>}
      </SettingsSectionHeader>

      <div className="avatar-section d-flex align-items-center mb-4 pb-4">
        <div
          className={`avatar-preview ${avatar ? 'clickable' : ''}`}
          onClick={handleAvatarPreview}
          title={avatar ? 'Click to view avatar' : ''}
        >
          {avatar ? <img src={avatar} alt="avatar preview" /> : getAvatarInitials(`${formData.firstName} ${formData.lastName}`, formData.email)}
        </div>
        <button className="btn btn-outline-secondary btn-sm ms-3" onClick={handleAvatarClick} disabled={avatarUploading || profileLoading || profileSaving}>
          {avatarUploading ? 'Uploading...' : 'Change Avatar'}
        </button>
        <button className="btn btn-outline-danger btn-sm ms-2" onClick={handleRemoveAvatar} disabled={!avatar || avatarUploading || profileLoading || profileSaving}>
          Remove Avatar
        </button>
        <input
          className="avatar-input"
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/gif"
          onChange={handleAvatarUpload}
        />
        <small className="ms-3 text-muted">JPG, PNG or GIF. Max size 2MB</small>
      </div>
      {showAvatarViewer && avatar && (
        <div className="avatar-viewer-overlay" onClick={() => setShowAvatarViewer(false)}>
          <div className="avatar-viewer-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="avatar-viewer-close"
              aria-label="Close avatar preview"
              onClick={() => setShowAvatarViewer(false)}
            >
              <FiX size={18} />
            </button>
            <img src={avatar} alt="Full avatar" />
            <button
              className="btn btn-dark btn-sm mt-3"
              onClick={() => setShowAvatarViewer(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <div className="form-row">
        <div className="form-group mb-3">
          <label className="form-label">First Name</label>
          <input 
            type="text" 
            className={`form-control ${profileFieldErrors.firstName ? 'is-invalid' : ''}`}
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            onKeyDown={preventLeadingSpace}
            disabled={profileLoading || profileSaving}
            placeholder="First name"
            aria-invalid={Boolean(profileFieldErrors.firstName)}
            aria-describedby={profileFieldErrors.firstName ? 'settings-first-name-error' : undefined}
          />
          {profileFieldErrors.firstName && (
            <div className="field-error" id="settings-first-name-error">{profileFieldErrors.firstName}</div>
          )}
        </div>
        <div className="form-group mb-3">
          <label className="form-label">Last Name</label>
          <input 
            type="text" 
            className={`form-control ${profileFieldErrors.lastName ? 'is-invalid' : ''}`}
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            onKeyDown={preventLeadingSpace}
            disabled={profileLoading || profileSaving}
            placeholder="Last name"
            aria-invalid={Boolean(profileFieldErrors.lastName)}
            aria-describedby={profileFieldErrors.lastName ? 'settings-last-name-error' : undefined}
          />
          {profileFieldErrors.lastName && (
            <div className="field-error" id="settings-last-name-error">{profileFieldErrors.lastName}</div>
          )}
        </div>
      </div>

      <div className="form-group mb-3">
        <label className="form-label">Email</label>
        <div className="locked-field">
          <input
            type="email"
            className="form-control"
            name="email"
            value={formData.email}
            disabled
            readOnly
            placeholder="email@example.com"
            aria-label="Email (locked)"
          />
          <FiLock className="lock-icon" aria-hidden="true" />
        </div>
        <small className="text-muted">Email can&apos;t be changed</small>
      </div>

      <div className="form-row">
        <div className="form-group mb-3">
          <label className="form-label">Role</label>
          <div className="settings-select-wrap">
            <select className="form-control settings-select" name="role" value={formData.role} onChange={handleChange} disabled={profileLoading || profileSaving}>
              {roleOptions.map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
            <FiChevronDown className="settings-select-icon" aria-hidden="true" />
          </div>
        </div>
        <div className="form-group mb-3">
          <label className="form-label">Timezone</label>
          <div className="settings-select-wrap">
            <select className="form-control settings-select" name="timezone" value={formData.timezone} onChange={handleChange} disabled={profileLoading || profileSaving}>
              {timezoneOptions.map((timezone) => (
                <option key={timezone} value={timezone}>{timezone}</option>
              ))}
            </select>
            <FiChevronDown className="settings-select-icon" aria-hidden="true" />
          </div>
        </div>
      </div>

      <button className="btn btn-dark mt-2" onClick={handleSave} disabled={profileSaving || profileLoading || avatarUploading}>
        {profileSaving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  )
}

const DEFAULT_NOTIFICATION_PREFS = {
  emailNotifications: true,
  issueAssignments: true,
  mentions: true,
  comments: false,
  statusChanges: true,
  weeklySummary: true
}

const NOTIFICATION_OPTIONS = [
  {
    key: 'emailNotifications',
    label: 'Email Notifications',
    description: 'Receive email notifications for updates'
  },
  {
    key: 'issueAssignments',
    label: 'Issue Assignments',
    description: 'Notify when issues are assigned to you'
  },
  {
    key: 'mentions',
    label: 'Mentions',
    description: 'Notify when someone mentions you'
  },
  {
    key: 'comments',
    label: 'Comments',
    description: 'Notify when someone comments on your issues'
  },
  {
    key: 'statusChanges',
    label: 'Status Changes',
    description: 'Notify when issue status changes'
  },
  {
    key: 'weeklySummary',
    label: 'Weekly Summary',
    description: 'Receive weekly project summary emails'
  }
]

function readNotificationPrefs(storageKey) {
  try {
    if (typeof window === 'undefined') return { ...DEFAULT_NOTIFICATION_PREFS }
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return { ...DEFAULT_NOTIFICATION_PREFS }

    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_NOTIFICATION_PREFS }

    const next = { ...DEFAULT_NOTIFICATION_PREFS }
    for (const key of Object.keys(DEFAULT_NOTIFICATION_PREFS)) {
      if (typeof parsed[key] === 'boolean') next[key] = parsed[key]
    }
    return next
  } catch {
    return { ...DEFAULT_NOTIFICATION_PREFS }
  }
}

function mergeNotificationPrefs(rawPrefs) {
  const next = { ...DEFAULT_NOTIFICATION_PREFS }
  if (!rawPrefs || typeof rawPrefs !== 'object') return next

  for (const key of Object.keys(DEFAULT_NOTIFICATION_PREFS)) {
    if (typeof rawPrefs[key] === 'boolean') {
      next[key] = rawPrefs[key]
    }
  }

  return next
}

function persistNotificationPrefs(storageKey, prefs) {
  try {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(storageKey, JSON.stringify(mergeNotificationPrefs(prefs)))
  } catch {
    // Keep settings usable even if local storage is unavailable.
  }
}

function isNotificationPrefsEndpointUnavailable(status) {
  return [404, 405, 501].includes(Number(status))
}

// ============ Notifications Section ============
function NotificationsSection({ onPreferencesSaved }) {
  const { user } = useAuth()
  const storageKey = user?.id ? `kpm360.notificationPrefs.${user.id}` : 'kpm360.notificationPrefs'
  const [preferences, setPreferences] = useState(() => mergeNotificationPrefs(user?.notificationPreferences || readNotificationPrefs(storageKey)))
  const [savedPreferences, setSavedPreferences] = useState(() => mergeNotificationPrefs(user?.notificationPreferences || readNotificationPrefs(storageKey)))
  const [preferencesLoading, setPreferencesLoading] = useState(false)
  const [preferencesSaving, setPreferencesSaving] = useState(false)
  const [preferencesError, setPreferencesError] = useState('')
  const [preferencesMessage, setPreferencesMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    const localPrefs = mergeNotificationPrefs(user?.notificationPreferences || readNotificationPrefs(storageKey))
    setPreferences(localPrefs)
    setSavedPreferences(localPrefs)
    setPreferencesError('')
    setPreferencesMessage('')

    async function loadPreferences() {
      if (!user?.id) return
      setPreferencesLoading(true)
      try {
        const headers = { 'X-USER-ID': String(user.id) }
        const res = await fetch(`${API_BASE}/api/user/notifications/preferences`, { headers })
        const body = await res.json().catch(() => ({}))

        if (res.ok) {
          const nextPrefs = mergeNotificationPrefs(body)
          if (cancelled) return
          setPreferences(nextPrefs)
          setSavedPreferences(nextPrefs)
          persistNotificationPrefs(storageKey, nextPrefs)
          return
        }

        const profileRes = await fetch(`${API_BASE}/api/user`, { headers })
        const profileBody = await profileRes.json().catch(() => ({}))
        const hasProfilePrefs = !!(profileBody?.notificationPreferences && typeof profileBody.notificationPreferences === 'object')

        if (profileRes.ok && hasProfilePrefs) {
          const nextPrefs = mergeNotificationPrefs(profileBody.notificationPreferences)
          if (cancelled) return
          setPreferences(nextPrefs)
          setSavedPreferences(nextPrefs)
          persistNotificationPrefs(storageKey, nextPrefs)
          return
        }

        if (isNotificationPrefsEndpointUnavailable(res.status)) {
          if (cancelled) return
          persistNotificationPrefs(storageKey, localPrefs)
          setPreferencesMessage('')
          return
        }

        throw new Error(body.message || profileBody.message || 'Failed to load notification preferences')
      } catch (err) {
        if (cancelled) return
        setPreferencesError(err.message || 'Failed to load notification preferences')
      } finally {
        if (!cancelled) setPreferencesLoading(false)
      }
    }

    loadPreferences()
    return () => { cancelled = true }
  }, [storageKey, user?.id, user?.notificationPreferences])

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(preferences) !== JSON.stringify(savedPreferences),
    [preferences, savedPreferences]
  )

  const savePreferences = async () => {
    setPreferencesError('')
    setPreferencesMessage('')
    setPreferencesSaving(true)

    try {
      let savedPrefs = mergeNotificationPrefs(preferences)
      let savedLocallyOnly = !user?.id

      if (user?.id) {
        const res = await fetch(`${API_BASE}/api/user/notifications/preferences`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-USER-ID': String(user.id)
          },
          body: JSON.stringify(preferences)
        })
        const body = await res.json().catch(() => ({}))
        if (res.ok) {
          savedPrefs = mergeNotificationPrefs(body)
        } else if (isNotificationPrefsEndpointUnavailable(res.status)) {
          savedLocallyOnly = true
        } else {
          throw new Error(body.message || 'Failed to save notification preferences')
        }
      }

      persistNotificationPrefs(storageKey, savedPrefs)
      setPreferences(savedPrefs)
      setSavedPreferences(savedPrefs)
      setPreferencesMessage(savedLocallyOnly ? 'Preferences saved on this device.' : 'Preferences saved successfully.')
      onPreferencesSaved?.()
    } catch (err) {
      setPreferencesError(err.message || 'Failed to save notification preferences')
    } finally {
      setPreferencesSaving(false)
    }
  }

  const handleToggle = (key) => {
    const nextPrefs = { ...preferences, [key]: !preferences[key] }
    setPreferences(nextPrefs)
    setPreferencesError('')
    setPreferencesMessage('')
  }

  const toggleOption = ({ key, label, description }) => {
    return (
      <div className="notification-item" key={key}>
        <div className="settings-option-row">
          <div className="notification-copy">
            <label className="notif-label">{label}</label>
            <p className="notif-description">{description}</p>
          </div>
          <button
            type="button"
            className={`toggle-switch ${preferences[key] ? 'active' : ''} ${(preferencesLoading || preferencesSaving) ? 'disabled' : ''}`}
            onClick={() => handleToggle(key)}
            disabled={preferencesLoading || preferencesSaving}
            role="switch"
            aria-checked={preferences[key]}
            aria-label={label}
          >
            <div className="toggle-slider"></div>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="settings-card">
      <SettingsSectionHeader
        icon={FiBell}
        title="Notification Preferences"
        subtitle="Choose how you want to be notified"
      />

      <p className="notif-helper">
        {preferencesLoading ? 'Loading your notification preferences...' : 'Update your preferences, then click Save Changes.'}
      </p>
      {preferencesError && <div className="text-danger small mt-2">{preferencesError}</div>}
      {!preferencesError && preferencesMessage && <div className="text-muted small mt-2">{preferencesMessage}</div>}

      <div className="notifications-list">
        {NOTIFICATION_OPTIONS.map(toggleOption)}
      </div>

      <button
        type="button"
        className="btn btn-dark mt-4"
        onClick={() => { void savePreferences() }}
        disabled={preferencesLoading || preferencesSaving || !hasUnsavedChanges}
      >
        {preferencesSaving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  )
}

// ============ Appearance Section ============
function AppearanceSection() {
  const [appearance, setAppearance] = useState(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark'
    const savedAppearanceRaw = localStorage.getItem('appearanceSettings')
    const savedAppearance = savedAppearanceRaw ? JSON.parse(savedAppearanceRaw) : {}

    return {
      theme: savedTheme,
      language: savedAppearance.language || 'english',
      sidebarDensity: savedAppearance.sidebarDensity || 'comfortable',
      showProjectIcons:
        typeof savedAppearance.showProjectIcons === 'boolean'
          ? savedAppearance.showProjectIcons
          : true
    }
  })

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setAppearance(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSaveAppearance = () => {
    localStorage.setItem('theme', appearance.theme)
    localStorage.setItem('appearanceSettings', JSON.stringify(appearance))
    document.documentElement.setAttribute('data-theme', appearance.theme)
    document.documentElement.setAttribute('data-sidebar-density', appearance.sidebarDensity)
    document.documentElement.setAttribute(
      'data-sidebar-project-icons',
      appearance.showProjectIcons ? 'show' : 'hide'
    )
    alert('Appearance saved successfully!')
  }

  return (
    <div className="settings-card">
      <SettingsSectionHeader
        icon={FiMonitor}
        title="Appearance"
        subtitle="Customize the look and feel"
      />

      <div className="form-group mb-4">
        <label className="form-label">Theme</label>
        <select 
          className="form-control" 
          name="theme"
          value={appearance.theme}
          onChange={handleChange}
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>

      <div className="form-group mb-4">
        <label className="form-label">Language</label>
        <select 
          className="form-control" 
          name="language"
          value={appearance.language}
          onChange={handleChange}
        >
          <option value="english">English</option>
        </select>
      </div>

      <div className="form-group mb-4">
        <label className="form-label">Sidebar Density</label>
        <select 
          className="form-control" 
          name="sidebarDensity"
          value={appearance.sidebarDensity}
          onChange={handleChange}
        >
          <option value="comfortable">Comfortable</option>
          <option value="compact">Compact</option>
        </select>
      </div>

      <div className="form-group mb-4">
        <div className="settings-option-row">
          <label className="form-label m-0">Display project icons in sidebar</label>
          <div
            className={`toggle-switch ${appearance.showProjectIcons ? 'active' : ''}`}
            onClick={() => setAppearance((prev) => ({ ...prev, showProjectIcons: !prev.showProjectIcons }))}
            role="switch"
            aria-checked={appearance.showProjectIcons}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setAppearance((prev) => ({ ...prev, showProjectIcons: !prev.showProjectIcons }))
              }
            }}
          >
            <input 
              type="checkbox" 
              className="toggle-input"
              name="showProjectIcons"
              checked={appearance.showProjectIcons}
              onChange={handleChange}
            />
            <div className="toggle-slider"></div>
          </div>
        </div>
      </div>

      <button className="btn btn-dark mt-4" onClick={handleSaveAppearance}>
        Save Appearance
      </button>
    </div>
  )
}

// ============ Security Section ============
function SecuritySection({ apiBase }) {
  const { user } = useAuth()
  const [passwords, setPasswords] = useState({
    newPassword: '',
    confirmPassword: ''
  })

  const [passwordError, setPasswordError] = useState('')
  const [confirmPasswordError, setConfirmPasswordError] = useState('')

  // Authenticator App (TOTP) 2FA states
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [twoFactorPending, setTwoFactorPending] = useState(false)
  const [twoFactorQr, setTwoFactorQr] = useState('')
  const [twoFactorSecret, setTwoFactorSecret] = useState('')
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [twoFactorLoading, setTwoFactorLoading] = useState(false)
  const [twoFactorError, setTwoFactorError] = useState('')
  const [twoFactorMsg, setTwoFactorMsg] = useState('')

  // OTP / verification flow states
  const [otp, setOtp] = useState(['','','','','',''])
  const [otpError, setOtpError] = useState('')
  const [sendingCode, setSendingCode] = useState(false)
  const [verifiedResetCode, setVerifiedResetCode] = useState('')
  const [pendingUserId, setPendingUserId] = useState(null)
  const [codeSentMsg, setCodeSentMsg] = useState('')

  const userEmail = user?.email || ''
  const currentOtpCode = otp.join('')
  const isResetCodeVerified = currentOtpCode.length === 6 && verifiedResetCode === currentOtpCode

  const twoFactorActive = twoFactorEnabled || twoFactorPending

  useEffect(() => {
    let cancelled = false

    async function load2fa() {
      if (!user?.id) return
      setTwoFactorError('')
      setTwoFactorMsg('')
      setTwoFactorLoading(true)

      try {
        const statusRes = await fetch(`${apiBase}/api/2fa/status`, {
          headers: { 'X-USER-ID': String(user.id) }
        })
        const statusBody = await statusRes.json().catch(() => ({}))
        if (!statusRes.ok) throw new Error(statusBody.message || 'Failed to load 2FA status')
        if (cancelled) return

        const enabled = !!statusBody.enabled
        const pending = !!statusBody.pending
        setTwoFactorEnabled(enabled)
        setTwoFactorPending(pending)

        // If setup is pending, fetch QR + secret so the user can continue setup
        if (!enabled && pending) {
          const setupRes = await fetch(`${apiBase}/api/2fa/setup`, {
            method: 'POST',
            headers: { 'X-USER-ID': String(user.id) }
          })
          const setupBody = await setupRes.json().catch(() => ({}))
          if (!setupRes.ok) throw new Error(setupBody.message || 'Failed to load 2FA setup')
          if (cancelled) return
          setTwoFactorQr(setupBody.qrCodeDataUrl || '')
          setTwoFactorSecret(setupBody.secret || '')
        } else {
          setTwoFactorQr('')
          setTwoFactorSecret('')
        }
      } catch (err) {
        if (!cancelled) setTwoFactorError(err.message || 'Failed to load 2FA status')
      } finally {
        if (!cancelled) setTwoFactorLoading(false)
      }
    }

    load2fa()
    return () => { cancelled = true }
  }, [apiBase, user?.id])

  const passwordRules = useMemo(
    () => [
      { id: 'length', label: 'Is at least 8 characters long', valid: passwords.newPassword.length >= 8 },
      { id: 'upper', label: 'Contains an uppercase letter (A-Z)', valid: /[A-Z]/.test(passwords.newPassword) },
      { id: 'lower', label: 'Contains a lowercase letter (a-z)', valid: /[a-z]/.test(passwords.newPassword) },
      { id: 'digit', label: 'Contains a number (0-9)', valid: /\d/.test(passwords.newPassword) },
      { id: 'special', label: 'Contains a special character (e.g. !@#$%)', valid: /[^A-Za-z0-9]/.test(passwords.newPassword) }
    ],
    [passwords.newPassword]
  )

  const handlePasswordChange = (e) => {
    const { name, value } = e.target
    const next = { ...passwords, [name]: value }
    setPasswords(next)
    setPasswordError('')
    if (next.newPassword && next.confirmPassword && next.newPassword !== next.confirmPassword) {
      setConfirmPasswordError('Passwords do not match')
    } else {
      setConfirmPasswordError('')
    }
  }

  function handleOtpChange(i, v){
    if(!/^[0-9]?$/.test(v)) return
    const next = [...otp]
    next[i] = v
    const nextCode = next.join('')
    setOtp(next)
    if (verifiedResetCode && verifiedResetCode !== nextCode) {
      setVerifiedResetCode('')
      setOtpError(nextCode.length === 6 ? 'Please verify the current reset code.' : '')
    } else if (otpError) {
      setOtpError('')
    }
    setPasswordError('')
    if(v && i<5){ const nextEl = document.getElementById('sec-otp-'+(i+1)); if(nextEl) nextEl.focus() }
  }

  function clearOtp(i){
    const next=[...otp]
    next[i]=''
    setOtp(next)
    if (verifiedResetCode) setVerifiedResetCode('')
    setOtpError('')
    setPasswordError('')
    const el = document.getElementById('sec-otp-'+i)
    if(el) el.focus()
  }

  async function sendVerificationCode(){
    setOtpError('')
    setCodeSentMsg('')
    setVerifiedResetCode('')
    setOtp(['','','','','',''])
    setPasswordError('')
    if(!userEmail) return setOtpError('No email configured for your account')
    setSendingCode(true)
    try{
      const res = await fetch(`${apiBase}/api/auth/forgot-password`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email: userEmail }) })
      const body = await res.json()
      if(!res.ok) throw new Error(body.message || 'Failed to send code')
      setPendingUserId(body.userId || (user && user.id))
      setCodeSentMsg('Verification code sent to ' + (body.email || userEmail))
    }catch(err){ setOtpError(err.message) }
    setSendingCode(false)
  }

  async function verifyCode(){
    setOtpError('')
    const joined = currentOtpCode
    if(joined.length!==6) return setOtpError('Enter full 6-digit code')
    if(!(pendingUserId || (user && user.id))) return setOtpError('Please request a reset code first')
    try{
      const res = await fetch(`${apiBase}/api/auth/verify-reset-code`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ userId: pendingUserId || (user && user.id), code: joined }) })
      const body = await res.json()
      if(!res.ok) throw new Error(body.message || 'Invalid reset code')
      setVerifiedResetCode(joined)
    }catch(err){
      setVerifiedResetCode('')
      setOtpError(err.message || 'Invalid reset code')
    }
  }

  async function handleUpdatePassword(){
    setPasswordError('')
    if(!isResetCodeVerified) {
      setVerifiedResetCode('')
      setOtpError(currentOtpCode.length === 6 ? 'Please verify a valid reset code before changing password' : 'Enter and verify the 6-digit reset code first')
      return setPasswordError('Please verify your reset code before changing password')
    }
    if (!passwords.newPassword || !passwords.confirmPassword) return setPasswordError('All fields are required')
    if (passwords.newPassword !== passwords.confirmPassword) {
      setConfirmPasswordError('Passwords do not match')
      return setPasswordError('New password and confirm password do not match')
    }
    if (passwords.newPassword.length < 8) return setPasswordError('New password must be at least 8 characters')
    // additional strength checks (optional)
    const missing = []
    if (!/[A-Z]/.test(passwords.newPassword)) missing.push('one uppercase letter')
    if (!/[a-z]/.test(passwords.newPassword)) missing.push('one lowercase letter')
    if (!/\d/.test(passwords.newPassword)) missing.push('one digit')
    if (!/[^A-Za-z0-9]/.test(passwords.newPassword)) missing.push('one special character')
    if (missing.length) return setPasswordError('Password must contain at least: ' + missing.join(', '))

    try{
      const res = await fetch(`${apiBase}/api/auth/reset-password`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ userId: pendingUserId || (user && user.id), code: currentOtpCode, newPassword: passwords.newPassword }) })
      const body = await res.json()
      if(!res.ok) throw new Error(body.message || 'Password change failed')
      alert('Password updated successfully')
      setPasswords({ newPassword:'', confirmPassword:'' })
      setConfirmPasswordError('')
      setOtp(['','','','','',''])
      setVerifiedResetCode('')
      setCodeSentMsg('')
      setOtpError('')
    }catch(err){
      const message = err.message || 'Password change failed'
      if (message.toLowerCase().includes('reset code')) {
        setVerifiedResetCode('')
        setOtpError(message)
        return
      }
      setPasswordError(message)
    }
  }

  async function handleToggle2FA() {
    if (!user?.id) {
      setTwoFactorError('Please login again.')
      return
    }

    setTwoFactorError('')
    setTwoFactorMsg('')
    setTwoFactorLoading(true)
    try {
      if (twoFactorActive) {
        const res = await fetch(`${apiBase}/api/2fa/disable`, {
          method: 'POST',
          headers: { 'X-USER-ID': String(user.id) }
        })
        const body = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(body.message || 'Failed to disable 2FA')
        setTwoFactorEnabled(false)
        setTwoFactorPending(false)
        setTwoFactorQr('')
        setTwoFactorSecret('')
        setTwoFactorCode('')
        setTwoFactorMsg('2FA disabled')
      } else {
        const res = await fetch(`${apiBase}/api/2fa/setup`, {
          method: 'POST',
          headers: { 'X-USER-ID': String(user.id) }
        })
        const body = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(body.message || 'Failed to start 2FA setup')
        setTwoFactorEnabled(!!body.enabled)
        setTwoFactorPending(!!body.pending)
        setTwoFactorQr(body.qrCodeDataUrl || '')
        setTwoFactorSecret(body.secret || '')
        setTwoFactorCode('')
      }
    } catch (err) {
      setTwoFactorError(err.message || '2FA action failed')
    } finally {
      setTwoFactorLoading(false)
    }
  }

  async function confirmAndEnable2FA() {
    if (!user?.id) {
      setTwoFactorError('Please login again.')
      return
    }

    const code = String(twoFactorCode || '').trim()
    if (!/^\d{6}$/.test(code)) {
      setTwoFactorError('Enter a valid 6-digit authenticator code')
      return
    }

    setTwoFactorError('')
    setTwoFactorMsg('')
    setTwoFactorLoading(true)
    try {
      const res = await fetch(`${apiBase}/api/2fa/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-USER-ID': String(user.id)
        },
        body: JSON.stringify({ code })
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.message || 'Failed to enable 2FA')
      setTwoFactorEnabled(true)
      setTwoFactorPending(false)
      setTwoFactorQr('')
      setTwoFactorSecret('')
      setTwoFactorCode('')
      setTwoFactorMsg('2FA enabled')
    } catch (err) {
      setTwoFactorError(err.message || 'Failed to enable 2FA')
    } finally {
      setTwoFactorLoading(false)
    }
  }

  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  return (
    <div className="settings-security-stack">
      {/* Change Password Card (email verification flow) */}
      <div className="settings-card mb-4">
        <SettingsSectionHeader
          icon={FiLock}
          title="Change Password"
          subtitle="We'll send a verification code to your email before allowing password change"
        />

        <div className="mb-3">
          <label className="form-label">Email</label>
          <input type="email" className="form-control" value={userEmail} readOnly />
        </div>

        <div className="mb-3 d-flex align-items-center verify-row">
          <button type="button" className="btn verify-btn" onClick={sendVerificationCode} disabled={sendingCode}>{sendingCode ? 'Sending...' : 'Send verification code'}</button>
          {codeSentMsg && <div className="code-sent-msg">{codeSentMsg}</div>}
        </div>

        {otpError && <div className="alert alert-danger">{otpError}</div>}

        <div className="otp-row">
          {otp.map((c,i)=> (
            <div key={i} className="otp-box-wrap">
              <input id={'sec-otp-'+i} className="otp-box" maxLength={1} value={c} onChange={e=>handleOtpChange(i,e.target.value)} />
              <button type="button" className="otp-clear" onClick={()=>clearOtp(i)} aria-label={`clear-${i}`}>x</button>
            </div>
          ))}
        </div>

        <div className="verify-code-row">
          <button type="button" className="verify-btn" onClick={verifyCode} disabled={isResetCodeVerified}>Verify code</button>
          {isResetCodeVerified && <span className="verified-badge">Code Verified</span>}
        </div>

        <div className="form-group mb-3 new-password-group">
          <label className="form-label">New Password</label>
          <p className="password-guidance">
            Suggested password should include uppercase letters, lowercase letters, numbers, special characters, and be at least 8 characters long.
          </p>
          <div className="password-wrapper">
            <input
              type={showNewPassword ? 'text' : 'password'}
              className="form-control"
              name="newPassword"
              value={passwords.newPassword}
              onChange={handlePasswordChange}
              placeholder="Enter your new password"
              autoComplete="new-password"
              disabled={!isResetCodeVerified}
            />
            <button type="button" className="password-toggle" onClick={() => setShowNewPassword(s => !s)} aria-label={showNewPassword ? 'Hide password' : 'Show password'}>
              {showNewPassword ? (
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" strokeLinecap="round" strokeLinejoin="round"></path>
                  <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round"></circle>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M17.94 17.94A10.97 10.97 0 0 1 12 20c-6 0-10-5.5-10-8 1.27-2.2 4.29-5 8.46-6.18" strokeLinecap="round" strokeLinejoin="round"></path>
                  <path d="M1 1l22 22" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
              )}
            </button>
          </div>
        </div>

        <div className="pw-rules settings-pw-rules">
          {passwordRules.map((rule) => (
            <div key={rule.id} className={`pw-rule ${rule.valid ? 'valid' : ''}`}>
              <span className="rule-mark">{rule.valid ? '✓' : '✕'}</span>
              <span>{rule.label}</span>
            </div>
          ))}
        </div>

        <div className="form-group mb-3">
          <label className="form-label">Confirm New Password</label>
          <div className="password-wrapper">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              className="form-control"
              name="confirmPassword"
              value={passwords.confirmPassword}
              onChange={handlePasswordChange}
              placeholder="Confirm your new password"
              autoComplete="new-password"
              disabled={!isResetCodeVerified}
            />
            <button type="button" className="password-toggle" onClick={() => setShowConfirmPassword(s => !s)} aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}>
              {showConfirmPassword ? (
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" strokeLinecap="round" strokeLinejoin="round"></path>
                  <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round"></circle>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M17.94 17.94A10.97 10.97 0 0 1 12 20c-6 0-10-5.5-10-8 1.27-2.2 4.29-5 8.46-6.18" strokeLinecap="round" strokeLinejoin="round"></path>
                  <path d="M1 1l22 22" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
              )}
            </button>
          </div>
        </div>

        {confirmPasswordError && (
          <div className="alert alert-danger mt-2" role="alert">
            {confirmPasswordError}
          </div>
        )}

        {passwordError && (
          <div className="alert alert-danger mt-3 mb-3" role="alert">
            {passwordError}
          </div>
        )}

        <button 
          className="btn btn-dark mt-2"
          onClick={handleUpdatePassword}
          disabled={!isResetCodeVerified}
        >
          Update Password
        </button>
      </div>

      {/* Two-Factor Authentication Card */}
      <div className="settings-card">
        <SettingsSectionHeader
          icon={FiShield}
          title="Two-Factor Authentication"
          subtitle="Add an extra layer of security to your account"
        />

        <div className="settings-option-row mb-4">
          <label className="form-label m-0">Enable Two-Factor Authentication</label>
          <div
            className={`toggle-switch ${twoFactorActive ? 'active' : ''} ${twoFactorLoading ? 'disabled' : ''}`}
            onClick={() => { if (!twoFactorLoading) handleToggle2FA() }}
            role="switch"
            aria-checked={twoFactorActive}
            tabIndex={0}
            onKeyDown={(e) => {
              if (twoFactorLoading) return
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleToggle2FA()
              }
            }}
          >
            <div className="toggle-slider"></div>
          </div>
        </div>

        {twoFactorError && (
          <div className="alert alert-danger" role="alert">
            {twoFactorError}
          </div>
        )}

        {twoFactorMsg && (
          <div className="alert alert-success" role="alert">
            {twoFactorMsg}
          </div>
        )}

        {twoFactorEnabled && (
          <div className="alert alert-info" role="alert">
            Two-factor authentication is enabled for your account.
          </div>
        )}

        {twoFactorActive && !twoFactorEnabled && (
          <div className="qr-code-section">
            <div className="qr-placeholder">
              <div className="qr-code-box">
                {twoFactorQr ? (
                  <img src={twoFactorQr} alt="2FA QR code" />
                ) : (
                  <div className="text-muted" style={{ fontSize: 12 }}>Generating QR…</div>
                )}
              </div>
              <p className="text-muted mt-3">Scan this QR code using Google Authenticator</p>
              {twoFactorSecret && (
                <p className="text-muted" style={{ fontSize: 12, margin: 0, textAlign: 'center' }}>
                  Or enter this key manually: <code style={{ wordBreak: 'break-all' }}>{twoFactorSecret}</code>
                </p>
              )}
            </div>

            <div className="form-group mt-3" style={{ maxWidth: 320 }}>
              <label className="form-label">Authenticator code</label>
              <input
                className="form-control"
                inputMode="numeric"
                pattern="\\d*"
                maxLength={6}
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value.replace(/\\D/g, '').slice(0, 6))}
                placeholder="Enter 6-digit code"
              />
            </div>

            <button
              className="btn btn-dark mt-4"
              onClick={confirmAndEnable2FA}
              disabled={twoFactorLoading}
            >
              {twoFactorLoading ? 'Enabling...' : 'Confirm and Enable 2FA'}
            </button>
          </div>
        )}

        {!twoFactorActive && (
          <button 
            className="btn btn-dark"
            onClick={handleToggle2FA}
            disabled={twoFactorLoading}
          >
            {twoFactorLoading ? 'Loading...' : 'Enable 2FA'}
          </button>
        )}
    
       
        {twoFactorActive && (
          <button 
            className="btn btn-outline-danger mt-2"
            onClick={handleToggle2FA}
            disabled={twoFactorLoading}
          >
            {twoFactorEnabled ? 'Disable 2FA' : 'Cancel 2FA Setup'}
          </button>
        )}
      </div>
    </div>
  )
}
