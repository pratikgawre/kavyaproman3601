import { useEffect, useRef, useState } from 'react'
import { useNavigate, NavLink } from 'react-router-dom'
import './Dashboard.css'
import './Project.css'
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
  FiArchive,
  FiMoreVertical,
  FiCalendar,
  FiX,
  FiGitBranch,
  FiTag,
  FiPackage,
  FiInfo
} from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import useIssueNotifications from '../hooks/useIssueNotifications'

const getAvatarInitials = (name, email) => {
  const source = (name || '').trim() || (email || '').trim()
  if (!source) return 'G'
  const parts = source.split(/[\s._-]+/).filter(Boolean)
  if (parts.length === 0) return source.charAt(0).toUpperCase()
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase()
}

const PROJECTS = [
  {
    id: 'KPM',
    icon: '🚀',
    name: 'KavyaProMan 360',
    description: 'Enhanced project management system with Jira-like features',
    completedIssues: 1,
    totalIssues: 10,
    teamLead: 'Sarah Johnson',
    createdOn: '15/1/2024',
    isArchived: false
  },
  {
    id: 'WEB',
    icon: '🌐',
    name: 'Website Redesign',
    description: 'Corporate website modernization project',
    completedIssues: 0,
    totalIssues: 0,
    teamLead: 'Michael Chen',
    createdOn: '1/2/2024',
    isArchived: false
  },
  {
    id: 'MOB',
    icon: '📱',
    name: 'Mobile App',
    description: 'Native mobile application development',
    completedIssues: 0,
    totalIssues: 0,
    teamLead: 'Emily Rodriguez',
    createdOn: '20/1/2024',
    isArchived: false
  }
]

const CREATE_TABS = [
  { key: 'Details', icon: FiFolder },
  { key: 'Members', icon: FiUsers },
  { key: 'Workflow', icon: FiGitBranch },
  { key: 'Versions', icon: FiTag },
  { key: 'Releases', icon: FiPackage }
]

const AVAILABLE_ICONS = ['🚀', '💼', '📱', '🎨', '⚙️', '🏗️', '🔬', '📊', '🎯', '💡', '💥', '🔥']

export default function Project() {
  const navigate = useNavigate()
  const { user, clearUser } = useAuth()
  const displayName = user?.name || (user?.email ? user.email.split('@')[0] : 'Guest')
  const avatarInitials = getAvatarInitials(user?.name, user?.email)
  const [selectedOrg, setSelectedOrg] = useState(() => {
    try { return typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('org') || 'null') : null } catch (e) { return null }
  })
  const [projects, setProjects] = useState(PROJECTS)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [activeCreateTab, setActiveCreateTab] = useState('Details')
  const [selectedProjectIcon, setSelectedProjectIcon] = useState('🚀')
  const [selectedProjectType, setSelectedProjectType] = useState('Scrum')
  const [projectName, setProjectName] = useState('')
  const [projectKey, setProjectKey] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [isPrivateProject, setIsPrivateProject] = useState(true)
  const [editingProjectId, setEditingProjectId] = useState(null)
  const [openProjectMenuId, setOpenProjectMenuId] = useState(null)
  const [showArchivedProjects, setShowArchivedProjects] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [topSearchText, setTopSearchText] = useState('')
  const {
    notifications,
    unreadCount,
    loading: notificationsLoading,
    error: notificationsError,
    markAsRead: markNotificationRead,
    markAllAsRead: markAllNotificationsRead,
    addNotification,
    dismissNotification,
    clearAllNotifications
  } = useIssueNotifications({ limit: 6 })
  const notificationRef = useRef(null)
  const topSearchInputRef = useRef(null)
  const activeProjects = projects.filter((project) => !project.isArchived)
  const archivedProjects = projects.filter((project) => project.isArchived)
  const visibleProjects = showArchivedProjects ? archivedProjects : activeProjects
  const isSaveDisabled = !projectName.trim() || !projectKey.trim()
  useEffect(() => {
    if (!openProjectMenuId) {
      return undefined
    }

    function handleDocumentClick(event) {
      if (event.target instanceof Element && !event.target.closest('.project-card-menu')) {
        setOpenProjectMenuId(null)
      }
    }

    document.addEventListener('click', handleDocumentClick)
    return () => document.removeEventListener('click', handleDocumentClick)
  }, [openProjectMenuId])

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
    if (!mobileSearchOpen) return
    const timeoutId = setTimeout(() => topSearchInputRef.current?.focus(), 0)
    return () => clearTimeout(timeoutId)
  }, [mobileSearchOpen])


  function handleLogout() {
    clearUser()
    navigate('/login', { replace: true })
  }

  function toggleNotifications() {
    setShowNotifications((value) => !value)
  }

  function resetCreateForm() {
    setActiveCreateTab('Details')
    setSelectedProjectIcon('🚀')
    setSelectedProjectType('Scrum')
    setProjectName('')
    setProjectKey('')
    setProjectDescription('')
    setIsPrivateProject(true)
    setEditingProjectId(null)
  }

  function handleOpenCreateModal() {
    resetCreateForm()
    setShowCreateModal(true)
  }

  function handleCloseCreateModal() {
    setShowCreateModal(false)
    resetCreateForm()
  }

  function formatCreatedOn(date) {
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`
  }

  function getUniqueProjectKey(currentProjects, keyBase, excludedId = null) {
    const list = Array.isArray(currentProjects) ? currentProjects : []
    let uniqueKey = (keyBase || '').toString().trim().toUpperCase()
    if (!uniqueKey) uniqueKey = 'PRJ'
    let suffix = 1
    while (list.some((project) => project.id === uniqueKey && project.id !== excludedId)) {
      uniqueKey = `${keyBase}${suffix}`
      suffix += 1
    }
    return uniqueKey
  }

  function handleSaveProject() {
    const normalizedName = projectName.trim()
    const normalizedKeyBase = projectKey.trim().toUpperCase()
    const normalizedDescription = projectDescription.trim()

    if (!normalizedName || !normalizedKeyBase) {
      return
    }

    const uniqueKey = getUniqueProjectKey(projects, normalizedKeyBase, editingProjectId)

    if (editingProjectId) {
      setProjects((current) => current.map((project) => (
        project.id === editingProjectId
          ? {
              ...project,
              id: uniqueKey,
              icon: selectedProjectIcon,
              name: normalizedName,
              description: normalizedDescription || 'No description provided',
              projectType: selectedProjectType
            }
          : project
      )))
      setShowCreateModal(false)
      resetCreateForm()
      return
    }

    const nextProject = {
      id: uniqueKey,
      icon: selectedProjectIcon,
      name: normalizedName,
      description: normalizedDescription || 'No description provided',
      completedIssues: 0,
      totalIssues: 0,
      teamLead: displayName,
      createdOn: formatCreatedOn(new Date()),
      isArchived: false,
      projectType: selectedProjectType
    }

    setProjects((current) => [nextProject, ...(Array.isArray(current) ? current : [])])

    addNotification({
      id: `project-created-${uniqueKey}-${Date.now()}`,
      type: 'project_created',
      title: `Project created: ${normalizedName} (${uniqueKey})`
    })

    setShowCreateModal(false)
    resetCreateForm()
  }

  function handleEditProject(project) {
    setEditingProjectId(project.id)
    setActiveCreateTab('Details')
    setSelectedProjectIcon(project.icon || '🚀')
    setSelectedProjectType(project.projectType || 'Scrum')
    setProjectName(project.name || '')
    setProjectKey(project.id || '')
    setProjectDescription(project.description || '')
    setShowCreateModal(true)
    setOpenProjectMenuId(null)
  }

  function handleDeleteProject(projectId) {
    setProjects((current) => current.filter((project) => project.id !== projectId))
    setOpenProjectMenuId(null)
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

  function renderCreateTabContent() {
    if (activeCreateTab === 'Members') {
      return (
        <>
          <div className="create-field-block">
            <label>
              Project Lead
            </label>
            <button className="project-lead-pill">
              <span className="project-lead-avatar">SJ</span>
              <span>Sarah Johnson</span>
            </button>
            <p className="create-input-hint">Set a lead who can guide delivery and ownership.</p>
          </div>

          <div className="create-field-block">
            <div className="project-settings-card">
              <div className="project-settings-title">
                <FiUsers size={14} />
                <span>Team Members</span>
              </div>
              <p className="create-input-hint">Add and manage members for this project in this module.</p>
            </div>
          </div>
        </>
      )
    }

    if (activeCreateTab === 'Workflow') {
      return (
        <>
          <div className="create-field-block">
            <label>
              Workflow Type <span>*</span>
            </label>
            <div className="project-type-grid">
              <button
                className={`project-type-card ${selectedProjectType === 'Scrum' ? 'selected' : ''}`}
                onClick={() => setSelectedProjectType('Scrum')}
              >
                <div className="project-type-emoji">🏃</div>
                <h4>Scrum</h4>
                <p>Sprint-based development</p>
              </button>
              <button
                className={`project-type-card ${selectedProjectType === 'Kanban' ? 'selected' : ''}`}
                onClick={() => setSelectedProjectType('Kanban')}
              >
                <div className="project-type-emoji">📋</div>
                <h4>Kanban</h4>
                <p>Continuous delivery flow</p>
              </button>
            </div>
          </div>

          <div className="create-field-block">
            <div className="project-settings-card">
              <div className="project-settings-title">
                <FiSettings size={14} />
                <span>Project Settings</span>
              </div>
              <div className="project-private-row">
                <div>
                  <h5>Private Project</h5>
                  <p>Only members can view</p>
                </div>
                <button
                  className={`project-private-toggle ${isPrivateProject ? 'on' : ''}`}
                  onClick={() => setIsPrivateProject((value) => !value)}
                  aria-label="Toggle private project"
                >
                  <span />
                </button>
              </div>
            </div>
          </div>

          <div className="create-field-block create-field-block-full">
            <div className="project-key-note">
              <div className="project-key-note-icon">
                <FiInfo size={16} />
              </div>
              <div>
                <h5>Workflow</h5>
                <p>Choose the workflow template that best matches how your team plans work.</p>
              </div>
            </div>
          </div>
        </>
      )
    }

    if (activeCreateTab === 'Versions') {
      return (
        <>
          <div className="create-field-block create-field-block-full">
            <label>
              Initial Version
            </label>
            <input
              className="create-project-input"
              placeholder="e.g., v1.0.0"
            />
            <p className="create-input-hint">Define the first version for this project.</p>
          </div>

          <div className="create-field-block create-field-block-full">
            <div className="project-key-note">
              <div className="project-key-note-icon">
                <FiInfo size={16} />
              </div>
              <div>
                <h5>Versions</h5>
                <p>Use versions to track milestones and map issues to deliverables.</p>
              </div>
            </div>
          </div>
        </>
      )
    }

    if (activeCreateTab === 'Releases') {
      return (
        <>
          <div className="create-field-block create-field-block-full">
            <label>
              Release Plan
            </label>
            <textarea
              className="create-project-textarea"
              placeholder="Outline release goals, scope, and target timeline..."
            />
          </div>

          <div className="create-field-block create-field-block-full">
            <div className="project-key-note">
              <div className="project-key-note-icon">
                <FiInfo size={16} />
              </div>
              <div>
                <h5>Releases</h5>
                <p>Group versions into release cycles to communicate rollout targets clearly.</p>
              </div>
            </div>
          </div>
        </>
      )
    }

    return (
      <>
        <div className="create-field-block">
          <label>
            Project Icon
          </label>
          <div className="create-icon-grid">
            {AVAILABLE_ICONS.map((icon) => (
              <button
                key={icon}
                className={`create-icon-btn ${selectedProjectIcon === icon ? 'selected' : ''}`}
                onClick={() => setSelectedProjectIcon(icon)}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>

        <div className="create-field-block">
          <label>
            Project Type <span>*</span>
          </label>
          <div className="project-type-grid">
            <button
              className={`project-type-card ${selectedProjectType === 'Scrum' ? 'selected' : ''}`}
              onClick={() => setSelectedProjectType('Scrum')}
            >
              <div className="project-type-emoji">🏃</div>
              <h4>Scrum</h4>
              <p>Sprint-based development</p>
            </button>
            <button
              className={`project-type-card ${selectedProjectType === 'Kanban' ? 'selected' : ''}`}
              onClick={() => setSelectedProjectType('Kanban')}
            >
              <div className="project-type-emoji">📋</div>
              <h4>Kanban</h4>
              <p>Continuous delivery flow</p>
            </button>
          </div>
        </div>

        <div className="create-field-block">
          <label>
            Project Name <span>*</span>
          </label>
          <input
            className="create-project-input"
            placeholder="e.g., Mobile Application Development"
            value={projectName}
            onChange={(event) => setProjectName(event.target.value)}
          />
        </div>

        <div className="create-field-block">
          <label>
            Project Key <span>*</span>
          </label>
          <input
            className="create-project-input"
            placeholder="E.G., MAD"
            value={projectKey}
            onChange={(event) => setProjectKey(event.target.value.toUpperCase())}
            maxLength={10}
          />
          <p className="create-input-hint">Short identifier for this project (2-10 characters)</p>
        </div>

        <div className="create-field-block create-field-block-full">
          <label>
            Description
          </label>
          <textarea
            className="create-project-textarea"
            placeholder="Describe what this project is about..."
            value={projectDescription}
            onChange={(event) => setProjectDescription(event.target.value)}
          />
        </div>

        <div className="create-field-block create-field-block-full">
          <div className="project-key-note">
            <div className="project-key-note-icon">
              <FiInfo size={16} />
            </div>
            <div>
              <h5>Project Key</h5>
              <p>The project key will be used for all issues (e.g., KEY-123)</p>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <div className="project-page-root dashboard-root d-flex">
      <aside className={`sidebar d-flex flex-column ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-top">
          <div className="brand d-flex align-items-center">
            <div className="brand-logo">KP</div>
            <div className="brand-name">KavyaProMan</div>
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

      <main className={`content project-content flex-grow-1 p-4 ${collapsed ? 'with-topbar' : ''}`}>
        <header className="project-top-strip">
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
                onFocus={() => { if (isMobileScreen()) setMobileSearchOpen(true) }}
              />
              {mobileSearchOpen && (
                <button
                  type="button"
                  className="project-search-close"
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
                          <button className="mark-all-btn" onClick={markAllNotificationsRead} type="button">
                            Mark all read
                          </button>
                        )}
                        {notifications.length > 0 && (
                          <button className="clear-all-btn" onClick={clearAllNotifications} type="button">
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

            <button className="btn create-issue-medium" onClick={() => navigate('/create-issue')}>
              <FiPlus className="me-1" /> Create Issue
            </button>
          </div>
        </header>

        <section className="projects-shell">
          <div className="projects-header">
            <div className="projects-title">
              <h1>Projects</h1>
              <p>Manage and track your team projects</p>
            </div>

            <div className="projects-actions">
              <button className="btn project-outline-btn" onClick={() => setShowArchivedProjects((value) => !value)}>
                <FiArchive className="me-2" />
                {showArchivedProjects ? `View Active (${activeProjects.length})` : `View Archived (${archivedProjects.length})`}
              </button>
              <button className="btn create-issue-medium" onClick={handleOpenCreateModal}>
                <FiPlus className="me-1" /> Create Project
              </button>
            </div>
          </div>

          <div className="projects-banner">
            <span className="projects-banner-dot" />
            <span>Showing {visibleProjects.length} {showArchivedProjects ? 'archived' : 'active'} projects</span>
          </div>

          <div className="projects-grid">
            {visibleProjects.length === 0 ? (
              <div className="projects-empty-state">
                {showArchivedProjects ? 'No archived projects available right now.' : 'No active projects available right now.'}
              </div>
            ) : visibleProjects.map((project) => {
              const progress = project.totalIssues > 0 ? (project.completedIssues / project.totalIssues) * 100 : 0

              return (
                <article className="project-card-panel" key={project.id}>
                  <div className="project-card-head">
                    <div className="project-card-title-wrap">
                      <div className="project-emoji">{project.icon}</div>
                      <div>
                        <h3 className="project-card-title">{project.name}</h3>
                        <p className="project-card-code">{project.id}</p>
                      </div>
                    </div>

                    <div className="project-card-menu">
                      <button
                        className="project-menu-btn"
                        aria-label={`More actions for ${project.name}`}
                        onClick={(event) => {
                          event.stopPropagation()
                          setOpenProjectMenuId((current) => (current === project.id ? null : project.id))
                        }}
                      >
                        <FiMoreVertical size={18} />
                      </button>
                      {openProjectMenuId === project.id ? (
                        <div className="project-menu-dropdown" role="menu" aria-label={`Actions for ${project.name}`}>
                          <button className="project-menu-item" onClick={() => handleEditProject(project)}>Edit</button>
                          <button className="project-menu-item danger" onClick={() => handleDeleteProject(project.id)}>Delete</button>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <p className="project-card-description">{project.description}</p>

                  <div className="project-progress-head">
                    <span>Progress</span>
                    <strong>{project.completedIssues}/{project.totalIssues} issues</strong>
                  </div>
                  <div className="project-progress-track">
                    <div className="project-progress-fill" style={{ width: `${progress}%` }} />
                  </div>

                  <div className="project-meta-row">
                    <FiUsers size={15} />
                    <span>Team lead: {project.teamLead}</span>
                  </div>
                  <div className="project-meta-row">
                    <FiCalendar size={15} />
                    <span>Created {project.createdOn}</span>
                  </div>

                  <div className="project-card-actions">
                    <button className="project-action-btn" onClick={() => navigate(`/projects/${project.id}/board`, { state: { project } })}>Board</button>
                    <button className="project-action-btn" onClick={() => navigate(`/projects/${project.id}/backlog`, { state: { project } })}>Backlog</button>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      </main>

      {showCreateModal && (
        <div className="create-project-overlay" onClick={handleCloseCreateModal}>
          <div className="create-project-modal" onClick={(event) => event.stopPropagation()}>
            <div className="create-project-header">
              <div>
                <h2>{editingProjectId ? 'Edit Project' : 'Create New Project'}</h2>
                <p>{editingProjectId ? 'Update project details and workflow settings' : 'Set up a new project with team members and workflow'}</p>
              </div>
              <button className="create-project-close" onClick={handleCloseCreateModal} aria-label="Close create project dialog">
                <FiX size={18} />
              </button>
            </div>

            <div className="create-project-tabs">
              {CREATE_TABS.map((tab) => {
                const TabIcon = tab.icon
                return (
                  <button
                    key={tab.key}
                    className={`create-tab-btn ${activeCreateTab === tab.key ? 'active' : ''}`}
                    onClick={() => setActiveCreateTab(tab.key)}
                  >
                    <TabIcon size={15} />
                    <span>{tab.key}</span>
                  </button>
                )
              })}
            </div>

            <div className="create-project-body">
              {renderCreateTabContent()}
            </div>

            <div className="create-project-footer">
              <button className="create-cancel-btn" onClick={handleCloseCreateModal}>Cancel</button>
              <button className="create-save-btn" onClick={handleSaveProject} disabled={isSaveDisabled}>
                {editingProjectId ? 'Save Changes' : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
