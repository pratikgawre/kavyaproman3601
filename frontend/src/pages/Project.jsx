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
  FiCheck,
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

const stripLeadingSpace = (value) => value.replace(/^\s+/, '')
const sanitizeEmail = (value) => stripLeadingSpace(value).replace(/[^A-Za-z0-9@.]/g, '')
const preventLeadingSpace = (event) => {
  if (event.key === ' ' && (event.currentTarget.selectionStart ?? 0) === 0) event.preventDefault()
}

const normalizeRole = (role) => (role || '').trim().toLowerCase()
const normalizeProjectKeyValue = (value) => (value || '').toString().trim().toUpperCase()
const getRoleLabel = (role) => {
  const normalized = normalizeRole(role)
  if (normalized === 'admin' || normalized === 'project manager') return 'Project Manager'
  return role || ''
}
const resolveProjectRole = (role, fallback = 'Developer') => {
  const normalized = normalizeRole(role)
  if (!normalized) return fallback
  if (normalized === 'admin' || normalized === 'project manager') return 'Project Manager'
  if (normalized === 'tester') return 'Tester'
  if (normalized === 'developer') return 'Developer'
  return role.trim()
}
const formatDateValue = (value) => {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`
}

const normalizeProject = (project, fallbackLead) => {
  const key = (project?.projectKey || project?.key || project?.code || project?.id || '').toString().trim()
  return {
    ...project,
    id: project?.id || key,
    projectKey: key || '',
    icon: project?.icon || '📁',
    name: project?.name || 'Untitled Project',
    description: project?.description || 'No description provided',
    completedIssues: Number(project?.completedIssues ?? 0),
    totalIssues: Number(project?.totalIssues ?? 0),
    teamLead: project?.teamLead || fallbackLead || 'Team Lead',
    teamMembers: Array.isArray(project?.teamMembers) ? project.teamMembers : [],
    createdOn: project?.createdOn || formatDateValue(project?.createdAt),
    isArchived: project?.isArchived ?? false,
    projectType: project?.projectType || 'Scrum'
  }
}

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
  const [profileUser, setProfileUser] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const currentUser = profileUser || user || {}
  const displayName = currentUser?.name || (currentUser?.email ? currentUser.email.split('@')[0] : 'Guest')
  const avatarInitials = getAvatarInitials(currentUser?.name, currentUser?.email)
  const [selectedOrg, setSelectedOrg] = useState(() => {
    try { return typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('org') || 'null') : null } catch (e) { return null }
  })
  const [projects, setProjects] = useState([])
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [projectsError, setProjectsError] = useState('')
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
  const [teamMembers, setTeamMembers] = useState([])
  const [availableMembers, setAvailableMembers] = useState([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [membersError, setMembersError] = useState('')
  const [memberSearch, setMemberSearch] = useState('')
  const [showMemberSuggestions, setShowMemberSuggestions] = useState(false)
  const [memberCandidate, setMemberCandidate] = useState({ memberId: '', name: '', email: '', role: 'Developer' })
  const [emailVerificationStatus, setEmailVerificationStatus] = useState(null)
  const [verifiedEmailUser, setVerifiedEmailUser] = useState(null)
  const [showArchivedProjects, setShowArchivedProjects] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [topSearchText, setTopSearchText] = useState('')
  const [issueStatsByProject, setIssueStatsByProject] = useState({})
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
  const memberPickerRef = useRef(null)
  const API_BASE_URL = (import.meta?.env?.VITE_API_BASE || 'http://localhost:8080')
  const USERS_SEARCH_API_URL = `${API_BASE_URL}/api/users/search`
  const normalizedRole = normalizeRole(currentUser?.role)
  const isProjectManager = normalizedRole === 'admin' || normalizedRole === 'project manager'
  const managerEmail = (currentUser?.email || '').trim().toLowerCase()
  const memberEmail = managerEmail
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
      if (memberPickerRef.current && !memberPickerRef.current.contains(event.target)) {
        setShowMemberSuggestions(false)
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

  useEffect(() => {
    let isMounted = true
    const controller = new AbortController()

    const fetchIssues = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/issues`, { signal: controller.signal })
        if (!response.ok) {
          throw new Error('Failed to load issues')
        }
        const data = await response.json()
        const list = Array.isArray(data)
          ? data
          : (Array.isArray(data?.issues) ? data.issues : (Array.isArray(data?.data) ? data.data : []))
        if (!isMounted) return

        const stats = {}
        list.forEach((issue) => {
          const key = normalizeProjectKeyValue(issue?.project || issue?.projectKey || issue?.projectId)
          if (!key) return
          if (!stats[key]) {
            stats[key] = { total: 0, completed: 0 }
          }
          stats[key].total += 1
          const status = (issue?.status || '').toString().trim().toLowerCase()
          if (status === 'done' || status === 'completed') {
            stats[key].completed += 1
          }
        })

        setIssueStatsByProject(stats)
      } catch (err) {
        if (!isMounted || err.name === 'AbortError') return
        setIssueStatsByProject({})
      }
    }

    fetchIssues()
    return () => {
      isMounted = false
      controller.abort()
    }
  }, [API_BASE_URL])

  useEffect(() => {
    if (!user?.id) return
    let isMounted = true
    setProfileLoading(true)
    fetch(`${API_BASE_URL}/api/user`, {
      headers: { 'X-USER-ID': String(user.id) }
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted || !data) return
        setProfileUser(data)
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setProfileLoading(false)
      })
    return () => { isMounted = false }
  }, [API_BASE_URL, user?.id])

  useEffect(() => {
    let isMounted = true
    const controller = new AbortController()
    const fetchProjects = async () => {
      if (user?.id && profileLoading && !managerEmail) {
        return
      }
      setProjectsLoading(true)
      setProjectsError('')
      try {
        const queryParams = new URLSearchParams()
        if (isProjectManager && managerEmail) {
          queryParams.set('managerEmail', managerEmail)
        } else if (!isProjectManager && memberEmail) {
          queryParams.set('memberEmail', memberEmail)
        }
        const organizationId = selectedOrg?.id || selectedOrg?._id || ''
        const organizationUsername = selectedOrg?.username || selectedOrg?.slug || ''
        const organizationName = selectedOrg?.name || ''
        if (organizationId) {
          queryParams.set('organizationId', organizationId)
        } else if (organizationUsername) {
          queryParams.set('organizationUsername', organizationUsername)
        } else if (organizationName) {
          queryParams.set('organizationName', organizationName)
        }
        const query = queryParams.toString()
        const response = await fetch(`${API_BASE_URL}/api/projects${query ? `?${query}` : ''}`, { signal: controller.signal })
        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(errorText || 'Failed to load projects')
        }
        const data = await response.json()
        const list = Array.isArray(data) ? data : []
        if (!isMounted) return
        setProjects(list.map((project) => normalizeProject(project, displayName)))
      } catch (err) {
        if (!isMounted || err.name === 'AbortError') return
        setProjectsError(err.message || 'Failed to load projects')
        setProjects([])
      } finally {
        if (isMounted) setProjectsLoading(false)
      }
    }
    fetchProjects()
    return () => {
      isMounted = false
      controller.abort()
    }
  }, [
    API_BASE_URL,
    managerEmail,
    memberEmail,
    displayName,
    profileLoading,
    user?.id,
    isProjectManager,
    selectedOrg?.id,
    selectedOrg?._id,
    selectedOrg?.username,
    selectedOrg?.slug,
    selectedOrg?.name
  ])

  useEffect(() => {
    if (!showCreateModal) return
    const searchTerm = memberSearch.trim()
    if (searchTerm.length < 2) {
      setAvailableMembers([])
      setMembersError('')
      setMembersLoading(false)
      return
    }

    const controller = new AbortController()
    const debounceId = setTimeout(async () => {
      setMembersLoading(true)
      setMembersError('')
      try {
        const results = await fetchTeamMembers(searchTerm, controller.signal)
        setAvailableMembers(results)
      } catch (err) {
        if (err.name === 'AbortError') return
        setAvailableMembers([])
        setMembersError(err.message || 'Unable to load users')
      } finally {
        setMembersLoading(false)
      }
    }, 300)

    return () => {
      clearTimeout(debounceId)
      controller.abort()
    }
  }, [showCreateModal, memberSearch, USERS_SEARCH_API_URL])


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
    setTeamMembers([])
    setMemberSearch('')
    setShowMemberSuggestions(false)
    setMemberCandidate({ memberId: '', name: '', email: '', role: 'Developer' })
    setEmailVerificationStatus(null)
    setVerifiedEmailUser(null)
    setMembersError('')
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
    return formatDateValue(date)
  }

  function getUniqueProjectKey(currentProjects, keyBase, excludedId = null) {
    const list = Array.isArray(currentProjects) ? currentProjects : []
    let uniqueKey = (keyBase || '').toString().trim().toUpperCase()
    if (!uniqueKey) uniqueKey = 'PRJ'
    let suffix = 1
    while (list.some((project) => project.projectKey === uniqueKey && project.id !== excludedId)) {
      uniqueKey = `${keyBase}${suffix}`
      suffix += 1
    }
    return uniqueKey
  }

  async function handleSaveProject() {
    const normalizedName = projectName.trim()
    const normalizedKeyBase = projectKey.trim().toUpperCase()
    const normalizedDescription = projectDescription.trim()

    if (!normalizedName || !normalizedKeyBase) {
      return
    }

    const managerEmailValue = managerEmail || (currentUser?.email || '').trim().toLowerCase()
    const organizationId = selectedOrg?.id || selectedOrg?._id || null
    const organizationUsername = selectedOrg?.username || selectedOrg?.slug || null
    const organizationName = selectedOrg?.name || null
    if (!managerEmailValue) {
      alert('Unable to identify your account. Please log out and log in again.')
      return
    }

    try {
      if (editingProjectId) {
        const existing = projects.find((project) => project.id === editingProjectId)
        const payload = {
          projectKey: normalizedKeyBase,
          icon: selectedProjectIcon,
          name: normalizedName,
          description: normalizedDescription || 'No description provided',
          projectType: selectedProjectType,
          isArchived: existing?.isArchived ?? false,
          teamLead: existing?.teamLead || displayName,
          managerEmail: managerEmailValue,
          organizationId: organizationId || undefined,
          organizationUsername: organizationUsername || undefined,
          organizationName: organizationName || undefined,
          teamMembers: teamMembers.map((member) => ({
            memberId: member.memberId || member.id || null,
            name: member.name || '',
            email: member.email || '',
            role: member.role || '',
            status: member.status || ''
          }))
        }
        const response = await fetch(`${API_BASE_URL}/api/projects/${editingProjectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        if (response.status === 409) {
          const conflictText = await response.text()
          alert(conflictText || 'Project key already exists.')
          return
        }
        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(errorText || 'Failed to update project')
        }
        const updated = normalizeProject(await response.json(), displayName)
        setProjects((current) => current.map((project) => (
          project.id === updated.id ? updated : project
        )))
        setShowCreateModal(false)
        resetCreateForm()
        return
      }

      const uniqueKey = getUniqueProjectKey(projects, normalizedKeyBase, editingProjectId)
      const payload = {
        projectKey: uniqueKey,
        icon: selectedProjectIcon,
        name: normalizedName,
        description: normalizedDescription || 'No description provided',
        projectType: selectedProjectType,
        isArchived: false,
        teamLead: displayName,
        managerEmail: managerEmailValue,
        organizationId: organizationId || undefined,
        organizationUsername: organizationUsername || undefined,
        organizationName: organizationName || undefined,
        teamMembers: teamMembers.map((member) => ({
          memberId: member.memberId || member.id || null,
          name: member.name || '',
          email: member.email || '',
          role: member.role || '',
          status: member.status || ''
        }))
      }
      const response = await fetch(`${API_BASE_URL}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (response.status === 409) {
        const conflictText = await response.text()
        alert(conflictText || 'Project key already exists.')
        return
      }
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Failed to create project')
      }
      const created = normalizeProject(await response.json(), displayName)
      setProjects((current) => [created, ...(Array.isArray(current) ? current : [])])

      addNotification({
        id: `project-created-${created.projectKey || created.id}-${Date.now()}`,
        type: 'project_created',
        title: `Project created: ${normalizedName} (${created.projectKey || created.id})`
      })

      setShowCreateModal(false)
      resetCreateForm()
    } catch (err) {
      alert(err.message || 'Failed to save project')
    }
  }

  function handleEditProject(project) {
    setEditingProjectId(project.id)
    setActiveCreateTab('Details')
    setSelectedProjectIcon(project.icon || '🚀')
    setSelectedProjectType(project.projectType || 'Scrum')
    setProjectName(project.name || '')
    setProjectKey(project.projectKey || project.id || '')
    setProjectDescription(project.description || '')
    setTeamMembers(Array.isArray(project.teamMembers) ? project.teamMembers : [])
    setMemberCandidate({ memberId: '', name: '', email: '', role: 'Developer' })
    setMemberSearch('')
    setShowMemberSuggestions(false)
    setEmailVerificationStatus(null)
    setVerifiedEmailUser(null)
    setShowCreateModal(true)
    setOpenProjectMenuId(null)
  }

  async function handleDeleteProject(projectId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, { method: 'DELETE' })
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Failed to delete project')
      }
      setProjects((current) => current.filter((project) => project.id !== projectId))
    } catch (err) {
      alert(err.message || 'Failed to delete project')
    } finally {
      setOpenProjectMenuId(null)
    }
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

  const scopeMembersForUser = (list) => {
    return Array.isArray(list) ? list : []
  }

  const fetchTeamMembers = async (query, signal) => {
    const response = await fetch(
      `${USERS_SEARCH_API_URL}?query=${encodeURIComponent(query)}&limit=8`,
      { signal }
    )
    if (!response.ok) {
      throw new Error('Failed to fetch users')
    }
    const data = await response.json()
    return Array.isArray(data) ? data : []
  }

  const selectMemberSuggestion = (member) => {
    const name = (member?.name || '').trim()
    const email = (member?.email || '').trim().toLowerCase()
    if (!email) {
      alert('Selected user is missing an email address.')
      return
    }

    const displayNameValue = name || email
    setMemberCandidate((prev) => ({
      memberId: member?.id || member?.memberId || '',
      name: displayNameValue,
      email,
      role: resolveProjectRole(member?.role, prev.role || 'Developer')
    }))
    setMemberSearch(displayNameValue)
    setShowMemberSuggestions(false)
    setEmailVerificationStatus('verified')
    setVerifiedEmailUser({ name: displayNameValue, email })
  }

  const clearMemberCandidate = () => {
    setMemberCandidate({ memberId: '', name: '', email: '', role: 'Developer' })
    setEmailVerificationStatus(null)
    setVerifiedEmailUser(null)
  }

  const verifyEmailAddress = async () => {
    if (!memberCandidate.email) {
      alert('Please enter an email address')
      return
    }

    setEmailVerificationStatus('verifying')

    try {
      const email = memberCandidate.email.trim().toLowerCase()
      const response = await fetch(`${API_BASE_URL}/api/users/verify-email?email=${encodeURIComponent(email)}`)

      if (response.ok) {
        const userData = await response.json()
        const dbName = (userData?.name || '').trim()
        const resolvedRole = resolveProjectRole(userData.role, memberCandidate.role || 'Developer')
        setMemberCandidate((prev) => ({
          ...prev,
          name: dbName || prev.name,
          email,
          role: resolvedRole
        }))
        setVerifiedEmailUser(userData)
        setEmailVerificationStatus('verified')
        alert(`Email verified! User: ${userData.name || userData.email}`)
      } else if (response.status === 404) {
        setEmailVerificationStatus('not-found')
        setVerifiedEmailUser(null)
        alert('Email not found in database. Please check the email address.')
      } else {
        setEmailVerificationStatus('error')
        setVerifiedEmailUser(null)
        alert('Error verifying email. Server response: ' + response.status)
      }
    } catch (err) {
      setEmailVerificationStatus('error')
      setVerifiedEmailUser(null)
      alert('Failed to verify email: ' + err.message)
    }
  }

  const sendProjectInvitationEmail = async (email, name, role) => {
    const SEND_EMAIL_URL = `${API_BASE_URL}/api/email/send-invitation`
    const payload = {
      recipientEmail: email,
      recipientName: name,
      role,
      invitedBy: displayName,
      organizationName: selectedOrg?.name || 'KavyaProMan'
    }

    const response = await fetch(SEND_EMAIL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      throw new Error('Failed to send invitation email')
    }

    return await response.json()
  }

  const handleAddProjectMember = async () => {
    const name = (memberCandidate.name || '').trim()
    const email = (memberCandidate.email || '').trim().toLowerCase()
    const role = memberCandidate.role || 'Developer'

    if (!name || !email) {
      alert('Please enter both name and email')
      return
    }

    const alreadyAdded = teamMembers.some((member) => (member?.email || '').trim().toLowerCase() === email)
    if (alreadyAdded) {
      alert('This member is already added to the project')
      return
    }

    if (emailVerificationStatus !== 'verified') {
      alert('Please verify the email address first by clicking the Verify button')
      return
    }

    const displayNameValue = name || email
    const shouldAdd = window.confirm(`Add ${displayNameValue} (${email}) as ${getRoleLabel(role) || role} to the project team?`)
    if (!shouldAdd) {
      return
    }

    const newMember = {
      memberId: memberCandidate.memberId || null,
      name: displayNameValue,
      email,
      role,
      status: 'Invited'
    }

    setTeamMembers((current) => [...current, newMember])

    try {
      await sendProjectInvitationEmail(email, displayNameValue, role)
    } catch (err) {
      console.warn('Email sending failed, but member was added:', err)
    }

    alert(`${displayNameValue} was added to the project team.`)
    clearMemberCandidate()
    setMemberSearch('')
    setShowMemberSuggestions(false)
  }

  const handleRemoveProjectMember = (email) => {
    const normalizedEmail = (email || '').trim().toLowerCase()
    setTeamMembers((current) => current.filter((member) => (member?.email || '').trim().toLowerCase() !== normalizedEmail))
  }

  function renderCreateTabContent() {
    if (activeCreateTab === 'Members') {
      const scopedMembers = scopeMembersForUser(availableMembers)
      const rawSearchTerm = memberSearch.trim()
      const searchTerm = rawSearchTerm.toLowerCase()
      const isSearchReady = rawSearchTerm.length >= 2
      const selectedEmails = new Set(teamMembers.map((member) => (member?.email || '').trim().toLowerCase()))
      const filteredSuggestions = isSearchReady
        ? scopedMembers.filter((member) => {
            const name = (member?.name || '').toLowerCase()
            const email = (member?.email || '').toLowerCase()
            if (!name && !email) return false
            const matches = name.includes(searchTerm) || email.includes(searchTerm)
            if (!matches) return false
            return !selectedEmails.has(email)
          }).slice(0, 6)
        : []

      return (
        <>
          <div className="create-field-block">
            <label>
              Project Lead
            </label>
            <button className="project-lead-pill">
              <span className="project-lead-avatar">{getAvatarInitials(displayName, currentUser?.email)}</span>
              <span>{displayName}</span>
            </button>
            <p className="create-input-hint">Set a lead who can guide delivery and ownership.</p>
          </div>

          <div className="create-field-block">
            <label>
              Team Members
            </label>
            <div className="project-member-picker" ref={memberPickerRef}>
              <div className="project-member-search">
                <FiSearch size={14} />
                <input
                  type="text"
                  placeholder="Search by name or email"
                  value={memberSearch}
                  onChange={(event) => {
                    setMemberSearch(event.target.value)
                    setShowMemberSuggestions(true)
                  }}
                  onFocus={() => setShowMemberSuggestions(true)}
                />
                {memberSearch && (
                  <button
                    type="button"
                    className="project-member-clear"
                    onClick={() => {
                      setMemberSearch('')
                      setShowMemberSuggestions(false)
                    }}
                    aria-label="Clear search"
                  >
                    <FiX size={14} />
                  </button>
                )}
              </div>

              {showMemberSuggestions && (
                <div className="project-member-suggestions">
                  {membersLoading && (
                    <div className="project-member-suggestion muted">Searching users...</div>
                  )}
                  {!membersLoading && isSearchReady && filteredSuggestions.map((member) => (
                    <button
                      key={member.id || member.email}
                      type="button"
                      className="project-member-suggestion"
                      onClick={() => selectMemberSuggestion(member)}
                    >
                      <span className="project-member-avatar">{getAvatarInitials(member.name, member.email)}</span>
                      <span className="project-member-text">
                        <strong>{member.name || 'Unnamed'}</strong>
                        <span>{member.email}</span>
                      </span>
                      <span className="project-member-role">{getRoleLabel(member.role || 'Developer')}</span>
                    </button>
                  ))}
                  {!membersLoading && isSearchReady && filteredSuggestions.length === 0 && (
                    <div className="project-member-suggestion muted">No matching users found</div>
                  )}
                  {!membersLoading && !rawSearchTerm && (
                    <div className="project-member-suggestion muted">Start typing to search members</div>
                  )}
                  {!membersLoading && rawSearchTerm && !isSearchReady && (
                    <div className="project-member-suggestion muted">Type at least 2 characters to search</div>
                  )}
                  {!membersLoading && membersError && (
                    <div className="project-member-suggestion muted">{membersError}</div>
                  )}
                </div>
              )}

              <div className="project-member-form">
                <div className="project-member-field">
                  <label>Name *</label>
                  <input
                    type="text"
                    placeholder="Enter member name"
                    value={memberCandidate.name}
                    onChange={(event) => setMemberCandidate((prev) => ({ ...prev, name: event.target.value }))}
                  />
                </div>
                <div className="project-member-field project-member-field-full">
                  <label>Email *
                    {emailVerificationStatus === 'verified' && (
                      <span className="verification-status verified">
                        <FiCheck size={14} /> Verified
                      </span>
                    )}
                    {emailVerificationStatus === 'not-found' && (
                      <span className="verification-status not-found">Not Found</span>
                    )}
                    {emailVerificationStatus === 'error' && (
                      <span className="verification-status error">Error</span>
                    )}
                  </label>
                  <div className="project-member-email-row">
                    <input
                      type="email"
                      placeholder="Enter member email"
                      value={memberCandidate.email}
                      onChange={(event) => {
                        setMemberCandidate((prev) => ({ ...prev, email: sanitizeEmail(event.target.value) }))
                        setEmailVerificationStatus(null)
                        setVerifiedEmailUser(null)
                      }}
                      onKeyDown={preventLeadingSpace}
                    />
                    <button
                      type="button"
                      className={`verify-btn verify-btn-${emailVerificationStatus || 'default'}`}
                      onClick={verifyEmailAddress}
                      disabled={!memberCandidate.email || emailVerificationStatus === 'verifying'}
                      title="Verify email address in database"
                    >
                      {emailVerificationStatus === 'verifying' ? (
                        <>
                          <FiRepeat size={16} style={{ marginRight: '4px', animation: 'spin 1s linear infinite' }} />
                          Verifying...
                        </>
                      ) : emailVerificationStatus === 'verified' ? (
                        <>
                          <FiCheck size={16} style={{ marginRight: '4px' }} />
                          Verified
                        </>
                      ) : (
                        <>Verify</>
                      )}
                    </button>
                  </div>
                  {verifiedEmailUser && emailVerificationStatus === 'verified' && (
                    <div className="project-member-verified">
                      Found: {verifiedEmailUser.name || verifiedEmailUser.email}
                    </div>
                  )}
                </div>
                <div className="project-member-field">
                  <label>Role</label>
                  <div className="project-member-role-display">
                    <span>{memberCandidate.role || 'Developer'}</span>
                  </div>
                </div>
              </div>

              <div className="project-member-actions">
                <button type="button" className="project-member-add" onClick={handleAddProjectMember}>
                  Add to Project
                </button>
                <button type="button" className="project-member-reset" onClick={clearMemberCandidate}>
                  Clear
                </button>
              </div>
            </div>
            <p className="create-input-hint">Search by name or email and click a user to add them to the project team.</p>
          </div>

          <div className="create-field-block create-field-block-full">
            <div className="project-team-list">
              <div className="project-team-header">
                <span>Project Team ({teamMembers.length})</span>
              </div>
              {teamMembers.length > 0 ? (
                <div className="project-team-items">
                  {teamMembers.map((member) => (
                    <div className="project-team-item" key={member.email || member.memberId || member.name}>
                      <span className="project-team-avatar">{getAvatarInitials(member.name, member.email)}</span>
                      <span className="project-team-info">
                        <span className="project-team-name">{member.name || 'Unnamed'}</span>
                        <span className="project-team-email">{member.email}</span>
                      </span>
                      <span className="project-team-role">{getRoleLabel(member.role || 'Developer')}</span>
                      <button
                        type="button"
                        className="project-team-remove"
                        onClick={() => handleRemoveProjectMember(member.email)}
                        aria-label={`Remove ${member.name || 'member'}`}
                      >
                        <FiX size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="project-team-empty">No team members added yet.</div>
              )}
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
              <div className="avatar-icon">
                {currentUser?.avatar ? <img src={currentUser.avatar} alt="avatar" /> : avatarInitials}
              </div>
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

            {isProjectManager && (
              <button className="btn create-issue-medium" onClick={() => navigate('/create-issue')}>
                <FiPlus className="me-1" /> Create Issue
              </button>
            )}
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
              {isProjectManager && (
                <button className="btn create-issue-medium" onClick={handleOpenCreateModal}>
                  <FiPlus className="me-1" /> Create Project
                </button>
              )}
            </div>
          </div>

          <div className="projects-banner">
            <span className="projects-banner-dot" />
            <span>
              {projectsLoading
                ? 'Loading projects...'
                : `${isProjectManager ? '' : 'My Projects · '}Showing ${visibleProjects.length} ${showArchivedProjects ? 'archived' : 'active'} projects`}
            </span>
          </div>

          <div className="projects-grid">
            {projectsLoading ? (
              <div className="projects-empty-state">Loading projects...</div>
            ) : projectsError ? (
              <div className="projects-empty-state">{projectsError}</div>
            ) : visibleProjects.length === 0 ? (
              <div className="projects-empty-state">
                {showArchivedProjects ? 'No archived projects available right now.' : 'No active projects available right now.'}
              </div>
            ) : visibleProjects.map((project) => {
              const projectKeyValue = project.projectKey || project.id
              const normalizedKey = normalizeProjectKeyValue(projectKeyValue)
              const normalizedNameKey = normalizeProjectKeyValue(project.name)
              const issueSummary = issueStatsByProject[normalizedKey] || issueStatsByProject[normalizedNameKey]
              const totalIssues = Number(issueSummary?.total ?? project.totalIssues ?? 0)
              const completedIssues = Number(issueSummary?.completed ?? project.completedIssues ?? 0)
              const progress = totalIssues > 0 ? (completedIssues / totalIssues) * 100 : 0

              return (
                <article
                  className="project-card-panel"
                  key={project.id || projectKeyValue}
                  role="button"
                  tabIndex={0}
                  aria-label={`Open ${project.name} board`}
                  onClick={() => {
                    navigate(`/projects/${projectKeyValue}/board`, { state: { project: { ...project, id: projectKeyValue } } })
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      navigate(`/projects/${projectKeyValue}/board`, { state: { project: { ...project, id: projectKeyValue } } })
                    }
                  }}
                >
                  <div className="project-card-head">
                    <div className="project-card-title-wrap">
                      <div className="project-emoji">{project.icon}</div>
                      <div>
                        <h3 className="project-card-title">{project.name}</h3>
                        <p className="project-card-code">{projectKeyValue}</p>
                        {!isProjectManager && (
                          <span className="project-assigned-badge">Assigned to you</span>
                        )}
                      </div>
                    </div>

                    {isProjectManager && (
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
                            <button
                              className="project-menu-item"
                              onClick={(event) => {
                                event.stopPropagation()
                                handleEditProject(project)
                              }}
                            >
                              Edit
                            </button>
                            <button
                              className="project-menu-item danger"
                              onClick={(event) => {
                                event.stopPropagation()
                                handleDeleteProject(project.id)
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>

                  <p className="project-card-description">{project.description}</p>

                  <div className="project-progress-head">
                    <span>Progress</span>
                    <strong>{completedIssues}/{totalIssues} issues</strong>
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
                    <button
                      className="project-action-btn"
                      onClick={(event) => {
                        event.stopPropagation()
                        navigate(`/projects/${projectKeyValue}/board`, { state: { project: { ...project, id: projectKeyValue } } })
                      }}
                    >
                      Board
                    </button>
                    <button
                      className="project-action-btn"
                      onClick={(event) => {
                        event.stopPropagation()
                        navigate(`/projects/${projectKeyValue}/backlog`, { state: { project: { ...project, id: projectKeyValue } } })
                      }}
                    >
                      Backlog
                    </button>
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
