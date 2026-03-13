
import React, { useState, useEffect, useRef } from 'react'
import {
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
  FiX
} from 'react-icons/fi'
import './Settings.css'
import './Dashboard.css'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { uploadFile } from '../utils/upload'
import { getInitials } from '../utils/initials'

const stripLeadingSpace = (value) => value.replace(/^\s+/, '')
const sanitizeEmail = (value) => stripLeadingSpace(value).replace(/[^A-Za-z0-9@.]/g, '')
const preventLeadingSpace = (e) => {
  if (e.key === ' ' && (e.currentTarget.selectionStart ?? 0) === 0) e.preventDefault()
}
const API_BASE = (import.meta && import.meta.env && import.meta.env.VITE_API_BASE) || 'http://localhost:8080'

export default function Settings() {
  // basic UI state
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')

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
  const displayName = user?.name || (user?.email ? user.email.split('@')[0] : 'Guest')
  const sidebarInitials = getInitials(user?.name || displayName, user?.email)

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

  return (
    <div className="dashboard-root d-flex">
      <aside className={`sidebar d-flex flex-column ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-top">
          <div className="brand d-flex align-items-center">
            <div className="brand-logo">KP</div>
            <div className="brand-name">KavyaProMan</div>
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
                {user?.avatar ? <img src={user.avatar} alt="avatar" /> : sidebarInitials}
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
          {activeTab === 'notifications' && <NotificationsSection />}
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
  const registrationRoles = ['Admin', 'Project Manager', 'Developer', 'Tester', 'Business Analyst']
  const [formData, setFormData] = useState(() => {
    const savedProfile = JSON.parse(localStorage.getItem('profileSettings') || 'null')
    if (savedProfile) return savedProfile

    const fullName = (user?.name || '').trim()
    const nameParts = fullName ? fullName.split(/\s+/) : []

    return {
      firstName: nameParts[0] || '',
      lastName: nameParts.slice(1).join(' ') || '',
      email: user?.email || '',
      role: user?.role || 'Member',
      timezone: 'UTC'
    }
  })
  const roleOptions = formData.role && !registrationRoles.includes(formData.role)
    ? [formData.role, ...registrationRoles]
    : registrationRoles
  const [avatar, setAvatar] = useState(user?.avatar || '')
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [showAvatarViewer, setShowAvatarViewer] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    setAvatar(user?.avatar || '')
  }, [user])

  const avatarInitials = getInitials(
    `${formData.firstName} ${formData.lastName}`.trim(),
    formData.email || user?.email
  )

  
  const handleChange = (e) => {
    const { name, value } = e.target
    const nextValue = name === 'email' ? sanitizeEmail(value) : value
    setFormData(prev => ({ ...prev, [name]: nextValue }))
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      alert('Please upload JPG, PNG, or GIF image only.')
      e.target.value = ''
      return
    }

    const maxSize = 2 * 1024 * 1024
    if (file.size > maxSize) {
      alert('Image size must be less than 2MB.')
      e.target.value = ''
      return
    }

    setAvatarUploading(true)
    try {
      const uploaded = await uploadFile(file, { folder: 'avatars' })
      const url = uploaded?.url
      if (!url) throw new Error('Upload did not return a URL')
      setAvatar(url)
      if (user) {
        const updatedUser = { ...user, avatar: url }
        setUser(updatedUser)
      }
      if (user?.id) {
        const fullName = `${formData.firstName} ${formData.lastName}`.trim()
        await fetch(`${API_BASE}/api/user`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-USER-ID': user.id
          },
          body: JSON.stringify({
            name: fullName || user.name || '',
            email: formData.email || user.email || '',
            avatar: url,
            role: formData.role,
            timezone: formData.timezone
          })
        })
      }
      alert('Avatar uploaded successfully!')
    } catch (err) {
      alert(err.message || 'Avatar upload failed')
    } finally {
      setAvatarUploading(false)
      e.target.value = ''
    }
  }

  const handleAvatarPreview = () => {
    if (!avatar) return
    setShowAvatarViewer(true)
  }

  const handleRemoveAvatar = async () => {
    setAvatar('')
    setShowAvatarViewer(false)
    if (user) {
      setUser({ ...user, avatar: '' })
    }
    if (user?.id) {
      try {
        const fullName = `${formData.firstName} ${formData.lastName}`.trim()
        await fetch(`${API_BASE}/api/user`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-USER-ID': user.id
          },
          body: JSON.stringify({
            name: fullName || user.name || '',
            email: formData.email || user.email || '',
            avatar: '',
            role: formData.role,
            timezone: formData.timezone
          })
        })
      } catch (err) {
        console.error('Failed to clear avatar', err)
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    alert('Avatar removed successfully!')
  }

  const handleSave = () => {
    localStorage.setItem('profileSettings', JSON.stringify(formData))

    if (user) {
      const updatedUser = {
        ...user,
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        email: formData.email,
        role: formData.role
      }
      setUser(updatedUser)
    }

    console.log('Profile saved:', formData)
    alert('Profile changes saved successfully!')
  }

  return (
    <div className="settings-card">
      <div className="card-header">
        <h2>Profile Settings</h2>
        <p className="text-muted">Manage your personal information</p>
      </div>

      <div className="avatar-section d-flex align-items-center mb-4 pb-4">
        <div
          className={`avatar-preview ${avatar ? 'clickable' : ''}`}
          onClick={handleAvatarPreview}
          title={avatar ? 'Click to view avatar' : ''}
        >
          {avatar ? <img src={avatar} alt="avatar preview" /> : avatarInitials}
        </div>
        <button className="btn btn-outline-secondary btn-sm ms-3" onClick={handleAvatarClick} disabled={avatarUploading}>
          {avatarUploading ? 'Uploading...' : 'Change Avatar'}
        </button>
        <button className="btn btn-outline-danger btn-sm ms-2" onClick={handleRemoveAvatar} disabled={!avatar}>
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
            className="form-control" 
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            placeholder="First name" 
          />
        </div>
        <div className="form-group mb-3">
          <label className="form-label">Last Name</label>
          <input 
            type="text" 
            className="form-control" 
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            placeholder="Last name" 
          />
        </div>
      </div>

      <div className="form-group mb-3">
        <label className="form-label">Email</label>
        <input 
          type="email" 
          className="form-control" 
          name="email"
          value={formData.email}
          onChange={handleChange}
          onKeyDown={preventLeadingSpace}
          placeholder="email@example.com" 
        />
      </div>

      <div className="form-row">
        <div className="form-group mb-3">
          <label className="form-label">Role</label>
          <select className="form-control" name="role" value={formData.role} onChange={handleChange}>
            {roleOptions.map((role) => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>
        <div className="form-group mb-3">
          <label className="form-label">Timezone</label>
          <select className="form-control" name="timezone" value={formData.timezone} onChange={handleChange}>
            <option>UTC</option>
            <option>GMT</option>
            <option>EST</option>
            <option>PST</option>
          </select>
        </div>
      </div>

      <button className="btn btn-dark mt-2" onClick={handleSave}>
        Save Changes
      </button>
    </div>
  )
}

// ============ Notifications Section ============
function NotificationsSection() {
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    issueAssignments: true,
    mentions: true,
    comments: false,
    statusChanges: true,
    weeklySummary: true
  })

  const handleToggle = (key) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const toggleOption = (key) => {
    return (
      <div className="notification-item" key={key}>
        <div className="d-flex align-items-center justify-content-between">
          <label className="notif-label">
            {key === 'emailNotifications' && 'Email Notifications'}
            {key === 'issueAssignments' && 'Issue Assignments'}
            {key === 'mentions' && 'Mentions'}
            {key === 'comments' && 'Comments'}
            {key === 'statusChanges' && 'Status Changes'}
            {key === 'weeklySummary' && 'Weekly Summary'}
          </label>
          <div className={`toggle-switch ${notifications[key] ? 'active' : ''}`} onClick={() => handleToggle(key)}>
            <div className="toggle-slider"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="settings-card">
      <div className="card-header">
        <h2>Notification Preferences</h2>
        <p className="text-muted">Choose how you want to be notified</p>
      </div>

      <div className="notifications-list">
        {toggleOption('emailNotifications')}
        {toggleOption('issueAssignments')}
        {toggleOption('mentions')}
        {toggleOption('comments')}
        {toggleOption('statusChanges')}
        {toggleOption('weeklySummary')}
      </div>

      <button className="btn btn-dark mt-4">
        Save Preferences
      </button>
    </div>
  )
}

// ============ Appearance Section ============
function AppearanceSection() {
  const [appearance, setAppearance] = useState(() => {
    const savedTheme = localStorage.getItem('theme') || 'light'
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
    alert('Appearance saved successfully!')
  }

  return (
    <div className="settings-card">
      <div className="card-header">
        <h2>Appearance</h2>
        <p className="text-muted">Customize the look and feel</p>
      </div>

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
        <div className="d-flex align-items-center justify-content-between">
          <label className="form-label m-0">Display project icons in sidebar</label>
          <div className={`toggle-switch ${appearance.showProjectIcons ? 'active' : ''}`}>
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
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)

  // OTP / verification flow states
  const [otp, setOtp] = useState(['','','','','',''])
  const [otpError, setOtpError] = useState('')
  const [sendingCode, setSendingCode] = useState(false)
  const [verified, setVerified] = useState(false)
  const [pendingUserId, setPendingUserId] = useState(null)
  const [codeSentMsg, setCodeSentMsg] = useState('')

  const userEmail = user?.email || ''

  const handlePasswordChange = (e) => {
    const { name, value } = e.target
    setPasswords(prev => ({ ...prev, [name]: value }))
    setPasswordError('')
  }

  function handleOtpChange(i, v){
    if(!/^[0-9]?$/.test(v)) return
    const next = [...otp]; next[i]=v; setOtp(next)
    if(v && i<5){ const nextEl = document.getElementById('sec-otp-'+(i+1)); if(nextEl) nextEl.focus() }
  }

  function clearOtp(i){ const next=[...otp]; next[i]=''; setOtp(next); const el = document.getElementById('sec-otp-'+i); if(el) el.focus() }

  async function sendVerificationCode(){
    setOtpError(''); setCodeSentMsg('');
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
    const joined = otp.join('')
    if(joined.length!==6) return setOtpError('Enter full 6-digit code')
    try{
      const res = await fetch(`${apiBase}/api/auth/verify-otp`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ userId: pendingUserId || (user && user.id), code: joined }) })
      const body = await res.json()
      if(!res.ok) throw new Error(body.message || 'Verification failed')
      setVerified(true)
    }catch(err){ setOtpError(err.message) }
  }

  async function handleUpdatePassword(){
    setPasswordError('')
    if(!verified) return setPasswordError('Please verify your email before changing password')
    if (!passwords.newPassword || !passwords.confirmPassword) return setPasswordError('All fields are required')
    if (passwords.newPassword !== passwords.confirmPassword) return setPasswordError('New password and confirm password do not match')
    if (passwords.newPassword.length < 8) return setPasswordError('New password must be at least 8 characters')
    // additional strength checks (optional)
    const missing = []
    if (!/[A-Z]/.test(passwords.newPassword)) missing.push('one uppercase letter')
    if (!/[a-z]/.test(passwords.newPassword)) missing.push('one lowercase letter')
    if (!/\d/.test(passwords.newPassword)) missing.push('one digit')
    if (!/[^A-Za-z0-9]/.test(passwords.newPassword)) missing.push('one special character')
    if (missing.length) return setPasswordError('Password must contain at least: ' + missing.join(', '))

    try{
      const res = await fetch(`${apiBase}/api/auth/reset-password`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ userId: pendingUserId || (user && user.id), code: otp.join(''), newPassword: passwords.newPassword }) })
      const body = await res.json()
      if(!res.ok) throw new Error(body.message || 'Password change failed')
      alert('Password updated successfully')
      setPasswords({ newPassword:'', confirmPassword:'' })
      setOtp(['','','','','','']); setVerified(false); setCodeSentMsg('')
    }catch(err){ setPasswordError(err.message) }
  }

  const handleToggle2FA = () => { setTwoFactorEnabled(!twoFactorEnabled) }

  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  return (
    <div>
      {/* Change Password Card (email verification flow) */}
      <div className="settings-card mb-4">
        <div className="card-header">
          <h2>Change Password</h2>
          <p className="text-muted">We'll send a verification code to your email before allowing password change</p>
        </div>

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
          <button type="button" className="verify-btn" onClick={verifyCode} disabled={verified}>Verify code</button>
          {verified && <span className="verified-badge">Verified</span>}
        </div>

        <div className="form-group mb-3 new-password-group">
          <label className="form-label">New Password</label>
          <div className="password-wrapper">
            <input
              type={showNewPassword ? 'text' : 'password'}
              className="form-control"
              name="newPassword"
              value={passwords.newPassword}
              onChange={handlePasswordChange}
              placeholder="Enter your new password"
              autoComplete="new-password"
              disabled={!verified}
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
              disabled={!verified}
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

        {passwordError && (
          <div className="alert alert-danger mt-3 mb-3" role="alert">
            {passwordError}
          </div>
        )}

        <button 
          className="btn btn-dark mt-2"
          onClick={handleUpdatePassword}
          disabled={!verified}
        >
          Update Password
        </button>
      </div>

      {/* Two-Factor Authentication Card */}
      <div className="settings-card">
        <div className="card-header">
          <h2>Two-Factor Authentication</h2>
          <p className="text-muted">Add an extra layer of security to your account</p>
        </div>

        <div className="d-flex align-items-center justify-content-between mb-4">
          <label className="form-label m-0">Enable Two-Factor Authentication</label>
          <div className={`toggle-switch ${twoFactorEnabled ? 'active' : ''}`} onClick={handleToggle2FA}>
            <div className="toggle-slider"></div>
          </div>
        </div>

        {twoFactorEnabled && (
          <div className="qr-code-section">
            <div className="qr-placeholder">
              <div className="qr-code-box">
                <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
                  <rect width="120" height="120" fill="#f0f0f0" />
                  <rect x="10" y="10" width="30" height="30" fill="#333" />
                  <rect x="80" y="10" width="30" height="30" fill="#333" />
                  <rect x="10" y="80" width="30" height="30" fill="#333" />
                  <rect x="50" y="50" width="20" height="20" fill="#333" />
                </svg>
              </div>
              <p className="text-muted mt-3">Scan this QR code using Google Authenticator</p>
            </div>

            <button 
              className="btn btn-dark mt-4"
              onClick={() => {
                alert('2FA has been enabled!')
              }}
            >
              Confirm and Enable 2FA
            </button>
          </div>
        )}

        {!twoFactorEnabled && (
          <button 
            className="btn btn-dark"
            onClick={handleToggle2FA}
          >
            Enable 2FA
          </button>
        )}
    
       
        {twoFactorEnabled && (
          <button 
            className="btn btn-outline-danger mt-2"
            onClick={handleToggle2FA}
          >
            Disable 2FA
          </button>
        )}
      </div>
    </div>
  )
}
