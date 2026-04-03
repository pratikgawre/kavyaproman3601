import { useNavigate, useLocation } from 'react-router-dom'
import './Dashboard.css'
import { FiGrid, FiFolder, FiUsers, FiBarChart2, FiCreditCard, FiSettings, FiLogOut, FiMenu, FiSearch, FiBell, FiPlus, FiShare2, FiDownload, FiTrash2, FiFilter, FiTag, FiBookmark, FiClock, FiRepeat, FiArrowRight, FiUpload, FiAlignLeft, FiAlignCenter, FiAlignRight, FiAlignJustify, FiShield, FiClipboard, FiChevronDown } from 'react-icons/fi'
import { NavLink } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FiX } from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import useIssueNotifications from '../hooks/useIssueNotifications'
import { uploadFiles } from '../utils/upload'
import { getInitials } from '../utils/initials'
import { openIssueAttachment } from '../utils/issueAttachments'

function formatDateForInput(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function normalizeRole(role) {
  return (role || '').trim().toLowerCase()
}

function normalizeProjectOverviewLabel(label) {
  return (label || '').toString().trim().toLowerCase()
}

function getProjectOverviewStatusKeyFromLabel(label) {
  const normalized = normalizeProjectOverviewLabel(label)
  if (normalized.includes('completed') || normalized.includes('archive')) return 'completed'
  if (normalized.includes('hold') || normalized.includes('pause') || normalized.includes('freeze')) return 'onHold'
  return 'active'
}

function isProjectOnHold(project) {
  const type = (project?.projectType || '').toString().trim().toLowerCase()
  if (type && (type.includes('hold') || type.includes('pause') || type.includes('freeze'))) return true
  const name = (project?.name || '').toString().trim().toLowerCase()
  return Boolean(name && name.includes('hold'))
}

function getProjectStatusKey(project) {
  if (project?.isArchived === true) return 'completed'
  if (isProjectOnHold(project)) return 'onHold'
  return 'active'
}

function normalizeStatus(value) {
  const normalized = (value || '').toString().trim().toLowerCase()
  if (normalized === 'todo' || normalized === 'to-do') return 'todo'
  if (normalized === 'progress' || normalized === 'in-progress' || normalized === 'in progress') return 'progress'
  if (normalized === 'review' || normalized === 'in-review' || normalized === 'in review') return 'review'
  if (normalized === 'done' || normalized === 'completed') return 'done'
  return 'todo'
}

function statusLabelFromStatus(status) {
  const normalized = normalizeStatus(status)
  if (normalized === 'todo') return 'to do'
  if (normalized === 'progress') return 'in progress'
  if (normalized === 'review') return 'in review'
  if (normalized === 'done') return 'done'
  return 'to do'
}

function normalizeSprintStatus(status) {
  const normalized = (status || '').toString().trim().toLowerCase()
  if (normalized === 'active' || normalized === 'started' || normalized === 'in progress' || normalized === 'in-progress') return 'active'
  if (normalized === 'completed' || normalized === 'complete' || normalized === 'done') return 'completed'
  return 'planned'
}

const STATUS_FILTER_OPTIONS = [
  { value: 'todo', label: 'To Do' },
  { value: 'progress', label: 'In Progress' },
  { value: 'review', label: 'In Review' },
  { value: 'done', label: 'Done' }
]

const DEFAULT_ISSUE_TYPE_OPTIONS = [
  { value: 'epic', label: 'Epic' },
  { value: 'story', label: 'Story' },
  { value: 'task', label: 'Task' },
  { value: 'bug', label: 'Bug' }
]

const PRIORITY_FILTER_ORDER = ['critical', 'high', 'medium', 'low']

function normalizeProjectMatchValue(value) {
  return (value || '').toString().trim().toLowerCase()
}

function formatProjectLabel(projectItem) {
  const key = (projectItem?.projectKey || projectItem?.id || '').toString().trim()
  const name = projectItem?.name || key || 'Project'
  return key ? `${name} (${key})` : name
}

function parseBackendDate(value) {
  if (!value) return null
  if (value instanceof Date) return value
  if (Array.isArray(value) && value.length >= 3) {
    const year = Number(value[0])
    const monthIndex = Number(value[1]) - 1
    const day = Number(value[2])
    const hour = Number(value[3] || 0)
    const minute = Number(value[4] || 0)
    const second = Number(value[5] || 0)
    const nano = Number(value[6] || 0)
    if (!Number.isFinite(year) || !Number.isFinite(monthIndex) || !Number.isFinite(day)) return null
    const ms = Number.isFinite(nano) ? Math.floor(nano / 1_000_000) : 0
    const d = new Date(year, monthIndex, day, hour, minute, second, ms)
    return Number.isNaN(d.getTime()) ? null : d
  }
  if (typeof value === 'object') {
    const year = Number(value.year)
    const monthValue = Number(value.monthValue ?? value.month)
    const day = Number(value.dayOfMonth ?? value.day)
    const hour = Number(value.hour ?? 0)
    const minute = Number(value.minute ?? 0)
    const second = Number(value.second ?? 0)
    const nano = Number(value.nano ?? 0)
    if (Number.isFinite(year) && Number.isFinite(monthValue) && Number.isFinite(day)) {
      const ms = Number.isFinite(nano) ? Math.floor(nano / 1_000_000) : 0
      const d = new Date(year, monthValue - 1, day, hour, minute, second, ms)
      return Number.isNaN(d.getTime()) ? null : d
    }
  }
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function normalizeDeadlineDate(value) {
  if (!value) return ''
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return ''
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10)
    const parsed = parseBackendDate(trimmed)
    return parsed ? formatDateForInput(parsed) : ''
  }
  const parsed = parseBackendDate(value)
  return parsed ? formatDateForInput(parsed) : ''
}

function normalizeIssueTypeValue(value) {
  return (value || '').toString().trim().toLowerCase()
}

function formatIssueTypeLabel(value) {
  const normalized = normalizeIssueTypeValue(value)
  const labels = {
    epic: 'Epic',
    story: 'Story',
    task: 'Task',
    bug: 'Bug',
    'sub-task': 'Sub-task',
    subtask: 'Sub-task'
  }
  if (labels[normalized]) return labels[normalized]
  if (!normalized) return 'Issue'
  return normalized
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function normalizePriorityValue(priority, difficulty) {
  const normalized = (priority || difficulty || '').toString().trim().toLowerCase()
  if (normalized === 'highest') return 'critical'
  return normalized
}

function priorityLabelFromValue(value) {
  const normalized = normalizePriorityValue(value)
  if (normalized === 'critical') return 'Critical'
  if (normalized === 'high') return 'High'
  if (normalized === 'medium') return 'Medium'
  if (normalized === 'low') return 'Low'
  if (!normalized) return 'Priority'
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

function priorityDotClass(value) {
  const normalized = normalizePriorityValue(value)
  if (normalized === 'critical') return 'dot-red'
  if (normalized === 'high') return 'dot-orange'
  if (normalized === 'medium') return 'dot-yellow'
  if (normalized === 'low') return 'dot-green'
  return 'dot-blue'
}

function formatSprintStatusLabel(status) {
  const normalized = normalizeSprintStatus(status)
  if (normalized === 'active') return 'Active'
  if (normalized === 'completed') return 'Completed'
  return 'Planned'
}

function formatSprintName(sprint) {
  const name = (sprint?.name || '').toString().trim()
  if (name) return name
  const order = Number(sprint?.order)
  if (Number.isFinite(order) && order > 0) return `Sprint ${order}`
  return 'Untitled sprint'
}

function compareFilterLabels(a, b) {
  return a.localeCompare(b, undefined, { sensitivity: 'base' })
}

function uniqueNormalizedValues(values, normalizer = normalizeProjectMatchValue) {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => normalizer(value))
        .filter(Boolean)
    )
  )
}

function normalizeFilterCriteria(criteria = {}) {
  return {
    status: uniqueNormalizedValues(criteria.status, normalizeStatus),
    issueType: uniqueNormalizedValues(criteria.issueType, normalizeIssueTypeValue),
    sprint: uniqueNormalizedValues(criteria.sprint, normalizeProjectMatchValue),
    priority: uniqueNormalizedValues(criteria.priority, (value) => normalizePriorityValue(value)),
    assignee: uniqueNormalizedValues(criteria.assignee, normalizeProjectMatchValue),
    project: uniqueNormalizedValues(criteria.project, normalizeProjectMatchValue),
    dueFrom: normalizeDeadlineDate(criteria.dueFrom),
    dueTo: normalizeDeadlineDate(criteria.dueTo)
  }
}

function stripLeadingSpace(value) {
  return (value || '').toString().replace(/^\s+/, '')
}

function preventLeadingSpace(e) {
  if (e.key === ' ' && (e.currentTarget.selectionStart ?? 0) === 0) e.preventDefault()
}

export default function Dashboard({ initialShowCreate = false }) {
  const API_BASE = (import.meta && import.meta.env && import.meta.env.VITE_API_BASE) || 'http://localhost:8080'
  const navigate = useNavigate()
  const handleViewTeam = (email, name) => {
    if (!email) return
    const params = new URLSearchParams()
    params.set('managerEmail', email)
    if (name) {
      params.set('managerName', name)
    }
    navigate(`/teams?${params.toString()}`)
  }
  const goToProjectsPage = () => navigate('/projects')
  const goToTeamsPage = () => navigate('/teams')
  const handleStatKeyDown = (event, clickHandler) => {
    if (!clickHandler) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      clickHandler()
    }
  }
  const location = useLocation()
  const { user, clearUser } = useAuth()
  const displayName = user?.name || (user?.email ? user.email.split('@')[0] : 'Guest')
  const avatarInitials = getInitials(user?.name || displayName, user?.email)
  const userEmail = (user?.email || '').trim().toLowerCase()
  const normalizedUserName = (user?.name || displayName || '').trim().toLowerCase()
  const isProjectManager = ['admin', 'project manager'].includes(normalizeRole(user?.role))
  const isDeveloper = normalizeRole(user?.role) === 'developer'
  const isTester = normalizeRole(user?.role) === 'tester'
  const isAssignedToUser = useCallback((issue) => {
    if (!issue) return false
    const assigneeEmail = (issue.assigneeEmail || '').toString().toLowerCase()
    if (assigneeEmail && userEmail && assigneeEmail === userEmail) return true
    const assigneeName = (issue.assigneeName || issue.assignee || '').toString().trim().toLowerCase()
    if (assigneeName && normalizedUserName && assigneeName === normalizedUserName) return true
    return false
  }, [normalizedUserName, userEmail])
  const isCreatedByUser = useCallback((issue) => {
    if (!issue) return false
    const creatorEmail = (issue.creatorEmail || '').toString().toLowerCase()
    if (creatorEmail && userEmail && creatorEmail === userEmail) return true
    const creatorName = (issue.creatorName || issue.creator || '').toString().trim().toLowerCase()
    if (creatorName && normalizedUserName && creatorName === normalizedUserName) return true
    return false
  }, [normalizedUserName, userEmail])
  const [selectedOrg, setSelectedOrg] = useState(() => {
    try { return typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('org') || 'null') : null } catch { return null }
  })
  const organizationId = selectedOrg?.id || selectedOrg?._id || ''
  const organizationUsername = selectedOrg?.username || selectedOrg?.slug || ''
  const organizationName = selectedOrg?.name || ''
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [showCreate, setShowCreate] = useState(initialShowCreate)
  const [showNotifications, setShowNotifications] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [topSearchText, setTopSearchText] = useState('')
  const [dashboardSearchText, setDashboardSearchText] = useState('')
  const [adminOverview, setAdminOverview] = useState(null)
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminError, setAdminError] = useState('')
  const isAdmin = normalizeRole(user?.role) === 'admin'
  const [adminUserList, setAdminUserList] = useState([])
  const [userManagementLoading, setUserManagementLoading] = useState(false)
  const [userManagementError, setUserManagementError] = useState('')
  const [activeUserAction, setActiveUserAction] = useState('manage')
  const [managerTeams, setManagerTeams] = useState([])
  const [managerTeamsLoading, setManagerTeamsLoading] = useState(false)
  const [managerTeamsError, setManagerTeamsError] = useState('')
  const [showManagerTeamsModal, setShowManagerTeamsModal] = useState(false)
  const [roleUpdatedAt, setRoleUpdatedAt] = useState(0)
  const handleAdminActionClick = (action, path) => () => {
    setActiveUserAction(action)
    if (path) {
      navigate(path)
    }
  }
  const handleCreateUserClick = () => {
    setActiveUserAction('manage')
    navigate('/teams?openInvite=1')
  }

  const loadManagerTeams = () => {
    if (!user?.id) {
      setManagerTeamsError('User session not ready')
      return
    }
    setManagerTeamsLoading(true)
    setManagerTeamsError('')
    fetch(`${API_BASE}/api/admin/manager-teams`, {
      headers: { 'X-USER-ID': String(user.id) }
    })
      .then(async (res) => {
        if (!res.ok) {
          const errorText = await res.text()
          throw new Error(errorText || 'Unable to load team data')
        }
        return res.json()
      })
      .then((data) => {
        setManagerTeams(Array.isArray(data) ? data : [])
      })
      .catch((err) => {
        console.error('failed to load manager teams', err)
        setManagerTeams([])
        setManagerTeamsError(err?.message || 'Unable to load teams')
      })
      .finally(() => {
        setManagerTeamsLoading(false)
      })
  }

  const handleTeamsStatClick = () => {
    if (!isAdmin) {
      goToTeamsPage()
      return
    }
    setShowManagerTeamsModal(true)
    loadManagerTeams()
  }
  const handlePendingRequestsClick = () => {
    if (!isAdmin) return
    navigate('/pending-requests')
  }

  const closeManagerTeamsModal = () => {
    setShowManagerTeamsModal(false)
  }
  useEffect(() => {
    if (!isAdmin || activeUserAction !== 'manage' || !user?.id) {
      setAdminOverview(null)
      setAdminError('')
      setAdminLoading(false)
      return
    }
    const controller = new AbortController()
    setAdminLoading(true)
    setAdminError('')
    fetch(`${API_BASE}/api/admin/dashboard`, {
      headers: { 'X-USER-ID': String(user.id) },
      signal: controller.signal
    })
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText || 'Unable to load admin overview')
        return res.json()
      })
      .then((data) => {
        setAdminOverview(data)
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return
        console.error('failed to load admin dashboard', err)
        setAdminError(err?.message || 'Unable to load admin overview')
      })
      .finally(() => {
        setAdminLoading(false)
      })
    return () => controller.abort()
  }, [API_BASE, activeUserAction, isAdmin, user?.id])

  useEffect(() => {
    if (!isAdmin || activeUserAction !== 'manage' || !user?.id) {
      return
    }
    const controller = new AbortController()
    setUserManagementLoading(true)
    setUserManagementError('')
    fetch(`${API_BASE}/api/admin/users?limit=16`, {
      headers: { 'X-USER-ID': String(user.id) },
      signal: controller.signal
    })
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText || 'Unable to load users')
        return res.json()
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setAdminUserList(data)
        } else {
          setAdminUserList([])
        }
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return
        console.error('failed to load user list', err)
        setUserManagementError(err?.message || 'Unable to load users')
        setAdminUserList([])
      })
      .finally(() => {
        setUserManagementLoading(false)
    })
    return () => controller.abort()
  }, [API_BASE, activeUserAction, isAdmin, user?.id, roleUpdatedAt])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const handler = () => setRoleUpdatedAt(Date.now())
    window.addEventListener('role:updated', handler)
    return () => window.removeEventListener('role:updated', handler)
  }, [])
  const {
    notifications,
    unreadCount,
    loading: notificationsLoading,
    error: notificationsError,
    markAsRead: markNotificationAsRead,
    markAllAsRead: markAllNotificationsAsRead,
    dismissNotification,
    clearAllNotifications
  } = useIssueNotifications({ limit: 6 })
  const [attachments, setAttachments] = useState([])
  const [uploadingAttachments, setUploadingAttachments] = useState(false)
  const [projects, setProjects] = useState([])
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [projectsError, setProjectsError] = useState('')
  const avatar = user?.avatar || ''
  const projectKeyFrom = (projectItem) => (projectItem?.projectKey || projectItem?.id || '').toString().trim()
  const issueProjectKeyFrom = (issueItem) => (issueItem?.project || issueItem?.projectKey || issueItem?.projectId || '').toString().trim().toUpperCase()

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

  // listen for organization changes
  useEffect(() => {
    function onOrgChanged(e){
      const org = e?.detail || null
      setSelectedOrg(org)
      try { if (org) localStorage.setItem('org', JSON.stringify(org)) }
      catch { /* ignore storage write failures */ }
    }
    window.addEventListener('org:changed', onOrgChanged)
    return () => window.removeEventListener('org:changed', onOrgChanged)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    setProjectsLoading(true)
    setProjectsError('')
    const email = (user?.email || '').trim()
    const queryParams = new URLSearchParams()
    if (email) {
      queryParams.set(isProjectManager ? 'managerEmail' : 'memberEmail', email)
    }
    if (organizationId) {
      queryParams.set('organizationId', organizationId)
    } else if (organizationUsername) {
      queryParams.set('organizationUsername', organizationUsername)
    } else if (organizationName) {
      queryParams.set('organizationName', organizationName)
    }
    const query = queryParams.toString()

    if (!query) {
      setProjects([])
      setProjectsLoading(false)
      return () => controller.abort()
    }

    fetch(`${API_BASE}/api/projects?${query}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          const errorText = await res.text()
          throw new Error(errorText || 'Failed to load projects')
        }
        return res.json()
      })
      .then((data) => {
        setProjects(Array.isArray(data) ? data : [])
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setProjects([])
        setProjectsError(err.message || 'Failed to load projects')
      })
      .finally(() => {
        setProjectsLoading(false)
      })

    return () => controller.abort()
  }, [API_BASE, isProjectManager, organizationId, organizationName, organizationUsername, user?.email])

  useEffect(() => {
    const controller = new AbortController()
    setSprintsLoading(true)
    setSprintsError('')
    fetch(`${API_BASE}/api/sprints`, { signal: controller.signal })
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
  }, [API_BASE])

  const [project, setProject] = useState('')
  const [didApplyPreselect, setDidApplyPreselect] = useState(false)
  const [issueType, setIssueType] = useState('Story')
  const [epicName, setEpicName] = useState('')
  const [summary, setSummary] = useState('')
  const [assignDate, setAssignDate] = useState('')
  const [deadlineDate, setDeadlineDate] = useState('')
  const [assigneeSearch, setAssigneeSearch] = useState('')
  const [assignee, setAssignee] = useState(null)
  const [assigneeDropdownOpen, setAssigneeDropdownOpen] = useState(false)
  const [errors, setErrors] = useState({})
  const [selectedDifficulty, setSelectedDifficulty] = useState('Medium')
  const createEmptyFilters = () => ({
    status: [],
    issueType: [],
    sprint: [],
    priority: [],
    assignee: [], 
    project: [],
    dueFrom: '',
    dueTo: ''
  })
  const [selectedFilters, setSelectedFilters] = useState(createEmptyFilters)
  const [savedFilters, setSavedFilters] = useState([])
  const fileInputRef = useRef(null)
  const assigneeRef = useRef(null)
  const notificationRef = useRef(null)
  const topSearchInputRef = useRef(null)
  const activeFilterCount =
    selectedFilters.status.length +
    selectedFilters.issueType.length +
    selectedFilters.sprint.length +
    selectedFilters.priority.length +
    selectedFilters.assignee.length +
    selectedFilters.project.length +
    (selectedFilters.dueFrom ? 1 : 0) +
    (selectedFilters.dueTo ? 1 : 0)
  const todayDateValue = formatDateForInput(new Date())

  useEffect(() => {
    function handleOutsideClick(e) {
      if (notificationRef.current && !notificationRef.current.contains(e.target)) {
        setShowNotifications(false)
      }
      if (assigneeRef.current && !assigneeRef.current.contains(e.target)) {
        setAssigneeDropdownOpen(false)
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
    try {
      const raw = localStorage.getItem('dashboardSavedFilters')
      const parsed = raw ? JSON.parse(raw) : []
      if (Array.isArray(parsed)) {
        setSavedFilters(parsed.map((item) => ({
          ...item,
          criteria: normalizeFilterCriteria(item?.criteria)
        })))
      }
    } catch (err) {
      console.error('failed to load saved filters', err)
    }
  }, [])

  function toggleNotifications() {
    setShowNotifications(prev => !prev)
  }

  function attachmentFromUpload(file, upload) {
    return {
      name: file.name,
      size: file.size,
      type: file.type,
      url: upload.url,
      publicId: upload.publicId,
      resourceType: upload.resourceType,
      format: upload.format,
      bytes: upload.bytes
    }
  }
  async function handleAddFiles(files){
    const arr = Array.from(files || [])
    if(arr.length === 0) return
    setUploadingAttachments(true)
    try{
      const uploaded = await uploadFiles(arr, { folder: 'issues' })
      const next = uploaded.map((u, idx) => attachmentFromUpload(arr[idx], u))
      setAttachments(prev => [...prev, ...next])
    }catch(err){
      console.error('file upload error', err)
      alert(err.message || 'File upload failed')
    } finally {
      setUploadingAttachments(false)
      if(fileInputRef.current) fileInputRef.current.value = ''
    }
  }
  function handleRemoveAttachment(idx){
    setAttachments(prev => prev.filter((_, i) => i !== idx))
  }
  
  function validateForm(){
    const errs = {}
    if(!project || project.trim() === '') errs.project = 'Project is required'
    if(!issueType || issueType.trim() === '') errs.issueType = 'Issue type is required'
    if(!epicName || epicName.trim() === '') errs.epicName = 'Epic name is required'
    if(!summary || summary.trim() === '') errs.summary = 'Summary is required'
    if(!assignDate) {
      errs.assignDate = 'Assign date is required'
    } else if (assignDate < todayDateValue) {
      errs.assignDate = 'Assign date cannot be in the past'
    }
    if(!deadlineDate) {
      errs.deadlineDate = 'Deadline date is required'
    } else if (assignDate && deadlineDate <= assignDate) {
      errs.deadlineDate = 'Deadline date must be after assign date'
    }
    // optional: require at least some description or attachments
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function preventLeadingSpaceInDescription(e) {
    if (e.key !== ' ') return
    const el = descRef.current
    if (!el) return
    const text = (el.innerText || '').replace(/\u00A0/g, ' ')
    if (!text.trim()) e.preventDefault()
  }

  async function handleCreate(e){
    e?.preventDefault()
    if(!validateForm()) return
    if (!user?.id) {
      alert('Please login to create an issue.')
      return
    }
    const normalizedAttachments = attachments.map(f => ({
      name: f.name,
      size: f.size,
      type: f.type,
      url: f.url,
      publicId: f.publicId,
      resourceType: f.resourceType,
      format: f.format,
      bytes: f.bytes,
      data: f.data
    }))
    const payload = {
      project: project?.trim(),
      issueType: issueType?.trim(),
      epicName: epicName?.trim(),
      summary: summary?.trim(),
      description: descRef.current?.innerHTML || '',
      creatorName: user?.name || '',
      creatorEmail: user?.email || '',
      assigneeName: assignee?.name || undefined,
      assigneeEmail: assignee?.email || undefined,
      assignDate: assignDate || undefined,
      deadlineDate: deadlineDate || undefined,
      attachmentsJson: JSON.stringify(normalizedAttachments),
      difficulty: selectedDifficulty
    }
    // send to backend API
    try{
      const res = await fetch(`${API_BASE}/api/issues`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'X-USER-ID': String(user.id) },
        body: JSON.stringify(payload)
      })
      if(!res.ok) throw new Error('server error')
    }catch(err){
      console.warn('backend save failed, saving locally', err)
      try{
        const raw = localStorage.getItem('myIssues')
        const arr = raw ? JSON.parse(raw) : []
        arr.push(payload)
        localStorage.setItem('myIssues', JSON.stringify(arr))
      }catch(err2){ console.error('failed to save issue locally', err2) }
    }
    // navigate to AllMyIssues page to view created issue
    setShowCreate(false)
    setEpicName('')
    setSummary('')
    setAssignDate('')
    setDeadlineDate('')
    setAssignee(null)
    setAssigneeSearch('')
    if(descRef.current) descRef.current.innerHTML = ''
    setAttachments([])
    setErrors({})
    // navigate to the AllMyIssues page
    navigate('/all-my-issues')
  }
  const descRef = useRef(null)
  const [formatState, setFormatState] = useState({ bold: false, italic: false, underline: false, align: 'left' })
// this is for discription formatting toolbar to reflect the current selection's formatting state
  function updateFormatState() {
    if (typeof document === 'undefined') return
    const editor = descRef.current
    if (!editor) return
    const selection = document.getSelection()
    if (!selection || selection.rangeCount === 0) return
    const anchor = selection.anchorNode
    const focus = selection.focusNode
    if (editor.contains(anchor) || editor.contains(focus)) {
      const align = document.queryCommandState('justifyCenter')
        ? 'center'
        : document.queryCommandState('justifyRight')
          ? 'right'
          : document.queryCommandState('justifyFull')
            ? 'justify'
            : 'left'
      setFormatState({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        align
      })
    }
  }

  useEffect(() => {
    function handleSelectionChange() {
      updateFormatState()
    }
    document.addEventListener('selectionchange', handleSelectionChange)
    return () => document.removeEventListener('selectionchange', handleSelectionChange)
  }, [])
  const [totalIssues, setTotalIssues] = useState(0)
  const [difficultyCounts, setDifficultyCounts] = useState({ High:0, Medium:0, Low:0 })
  const [taskCounts, setTaskCounts] = useState({ todo: 0, progress: 0, review: 0, done: 0 })
  const [overdueTasks, setOverdueTasks] = useState([])
  const [recentActivities, setRecentActivities] = useState([])
  const [dashboardIssues, setDashboardIssues] = useState([])
  const [sprints, setSprints] = useState([])
  const [sprintsLoading, setSprintsLoading] = useState(false)
  const [sprintsError, setSprintsError] = useState('')
  const preselectedProjectKey = useMemo(() => {
    const fromState = location.state?.projectKey || location.state?.project?.projectKey || location.state?.project?.id
    return fromState ? String(fromState).trim() : ''
  }, [location.state])

  useEffect(() => {
    if (preselectedProjectKey && !didApplyPreselect) {
      setProject(preselectedProjectKey)
      setDidApplyPreselect(true)
      return
    }
    if (!projects.length) return
    const projectKeys = projects.map(projectKeyFrom).filter(Boolean)
    if (!projectKeys.length) return
    if (!project || !projectKeys.includes(project)) {
      setProject(projectKeys[0])
    }
  }, [didApplyPreselect, preselectedProjectKey, project, projects])

  useEffect(() => {
    setAssignee(null)
    setAssigneeSearch('')
    setAssigneeDropdownOpen(false)
  }, [project])

  const selectedProjectData = useMemo(() => (
    projects.find((projectItem) => projectKeyFrom(projectItem) === project)
  ), [projects, project])

  const projectTeamMembers = useMemo(() => {
    const team = Array.isArray(selectedProjectData?.teamMembers) ? selectedProjectData.teamMembers : []
    return team
      .map((member) => ({
        name: (member?.name || member?.email || 'Member').trim(),
        email: (member?.email || '').trim().toLowerCase()
      }))
      .filter((member) => member.name || member.email)
  }, [selectedProjectData])

  const filteredTeamMembers = useMemo(() => {
    const term = assigneeSearch.trim().toLowerCase()
    if (!term) return projectTeamMembers
    return projectTeamMembers.filter((member) => (
      (member.name || '').toLowerCase().includes(term) ||
      (member.email || '').toLowerCase().includes(term)
    ))
  }, [assigneeSearch, projectTeamMembers])
  const activeProjects = useMemo(() => (
    (projects || []).map((projectItem) => {
      const key = projectKeyFrom(projectItem)
      // prefer backend-provided counts when available, otherwise derive from loaded issues
      let total = Number(projectItem?.totalIssues ?? 0)
      let completed = Number(projectItem?.completedIssues ?? 0)
      if ((!total || !completed) && Array.isArray(dashboardIssues)) {
        const projKey = (key || projectItem?.id || '').toString().trim()
        const issuesForProject = dashboardIssues.filter((it) => {
          const issueKey = (it.project || it.projectKey || it.projectId || '').toString().trim()
          return issueKey && issueKey.toUpperCase() === projKey.toUpperCase()
        })
        total = issuesForProject.length
        completed = issuesForProject.filter((it) => normalizeStatus(it?.status) === 'done').length
      }
      const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0
      const name = projectItem?.name || key || 'Project'
      const icon = key ? key.slice(0, 2).toUpperCase() : name.slice(0, 2).toUpperCase()
      return {
        ...projectItem,
        id: key || projectItem?.id,
        code: key,
        icon,
        progressCount: `${completed}/${total}`,
        progressPct
      }
    })
  ), [projects, dashboardIssues])
  const activeProjectKeys = useMemo(() => (
    new Set(
      activeProjects
        .map((projectItem) => projectKeyFrom(projectItem).toUpperCase())
        .filter(Boolean)
    )
  ), [activeProjects])
  const normalizedSprints = useMemo(() => (
    (sprints || []).map((sprint) => ({
      ...sprint,
      id: (sprint?.id || sprint?._id || '').toString().trim(),
      name: formatSprintName(sprint),
      projectKey: (sprint?.projectKey || '').toString().trim().toUpperCase(),
      status: normalizeSprintStatus(sprint.status)
    }))
  ), [sprints])
  const relevantSprints = useMemo(() => {
    if (!activeProjectKeys.size) return normalizedSprints
    return normalizedSprints.filter((sprint) => sprint.projectKey && activeProjectKeys.has(sprint.projectKey))
  }, [activeProjectKeys, normalizedSprints])
  const sprintLookupById = useMemo(() => {
    const lookup = new Map()
    normalizedSprints.forEach((sprint) => {
      const value = normalizeProjectMatchValue(sprint?.id)
      if (!value) return
      lookup.set(value, {
        label: sprint?.name || 'Untitled sprint',
        meta: formatSprintStatusLabel(sprint?.status)
      })
    })
    return lookup
  }, [normalizedSprints])
  const sprintRecencyTime = (sprint) => {
    const date = parseBackendDate(sprint?.updatedAt || sprint?.createdAt || sprint?.startDate || sprint?.start)
    return date ? date.getTime() : 0
  }
  const activeSprint = useMemo(() => {
    const candidates = relevantSprints.filter((sprint) => sprint.status === 'active')
    if (!candidates.length) return null
    const sorted = [...candidates].sort((a, b) => sprintRecencyTime(b) - sprintRecencyTime(a))
    return sorted[0]
  }, [relevantSprints])
  const sprintCardProject = useMemo(() => {
    if (!activeSprint) return activeProjects[0] || null
    const key = (activeSprint?.projectKey || '').toString().trim().toUpperCase()
    if (!key) return activeProjects[0] || null
    return activeProjects.find((projectItem) => projectKeyFrom(projectItem).toUpperCase() === key) || activeProjects[0] || null
  }, [activeSprint, activeProjects])
  const sprintIssues = useMemo(() => {
    if (!activeSprint?.id) return []
    return dashboardIssues.filter((issue) => (issue?.sprintId || issue?.sprint || '') === activeSprint.id)
  }, [dashboardIssues, activeSprint?.id])
  const sprintProgress = useMemo(() => {
    const total = sprintIssues.length
    const done = sprintIssues.filter((issue) => normalizeStatus(issue?.status) === 'done').length
    const pct = total ? Math.round((done / total) * 100) : 0
    return { total, done, pct }
  }, [sprintIssues])
  const sprintTimeLabel = useMemo(() => {
    if (!activeSprint) {
      if (sprintsLoading) return 'Loading sprint...'
      if (sprintsError) return sprintsError
      return 'No active sprint'
    }
    const startValue = activeSprint?.startDate || activeSprint?.start
    const endValue = activeSprint?.endDate || activeSprint?.end
    if (!startValue || !endValue) return 'Dates not set'
    const start = parseBackendDate(startValue) || new Date(startValue)
    const end = parseBackendDate(endValue) || new Date(endValue)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 'Dates not set'
    const now = new Date()
    const msPerDay = 1000 * 60 * 60 * 24
    const daysUntilStart = Math.ceil((start - now) / msPerDay)
    const daysUntilEnd = Math.ceil((end - now) / msPerDay)
    if (daysUntilStart > 0) {
      return `Starts in ${daysUntilStart} day${daysUntilStart === 1 ? '' : 's'}`
    }
    if (daysUntilEnd >= 0) {
      return `${daysUntilEnd} day${daysUntilEnd === 1 ? '' : 's'} left`
    }
    const daysPast = Math.abs(daysUntilEnd)
    return `Ended ${daysPast} day${daysPast === 1 ? '' : 's'} ago`
  }, [activeSprint, sprintsError, sprintsLoading])
  const filterableIssues = useMemo(() => (
    dashboardIssues.filter((issue) => {
      const assigneeEmail = (issue?.assigneeEmail || '').toString().toLowerCase()
      const assigneeName = (issue?.assigneeName || issue?.assignee || '').toString().trim().toLowerCase()
      const creatorEmail = (issue?.creatorEmail || '').toString().toLowerCase()
      const creatorName = (issue?.creatorName || issue?.creator || '').toString().trim().toLowerCase()
      const assignedToUser =
        (assigneeEmail && userEmail && assigneeEmail === userEmail) ||
        (assigneeName && normalizedUserName && assigneeName === normalizedUserName)
      const createdByUser =
        (creatorEmail && userEmail && creatorEmail === userEmail) ||
        (creatorName && normalizedUserName && creatorName === normalizedUserName)
      return assignedToUser || createdByUser
    })
  ), [dashboardIssues, normalizedUserName, userEmail])
  const statusFilterOptions = useMemo(() => (
    STATUS_FILTER_OPTIONS.map((option) => ({
      ...option,
      count: filterableIssues.filter((issue) => normalizeStatus(issue?.status) === option.value).length
    }))
  ), [filterableIssues])
  const issueTypeFilterOptions = useMemo(() => {
    const options = new Map(DEFAULT_ISSUE_TYPE_OPTIONS.map((option) => [option.value, option]))
    filterableIssues.forEach((issue) => {
      const value = normalizeIssueTypeValue(issue?.issueType || issue?.type)
      if (!value || options.has(value)) return
      options.set(value, { value, label: formatIssueTypeLabel(value) })
    })
    return Array.from(options.values())
      .map((option) => ({
        ...option,
        count: filterableIssues.filter((issue) => normalizeIssueTypeValue(issue?.issueType || issue?.type) === option.value).length
      }))
      .sort((a, b) => compareFilterLabels(a.label, b.label))
  }, [filterableIssues])
  const priorityFilterOptions = useMemo(() => {
    const values = new Set(PRIORITY_FILTER_ORDER)
    filterableIssues.forEach((issue) => {
      const value = normalizePriorityValue(issue?.priority, issue?.difficulty)
      if (value) values.add(value)
    })
    return Array.from(values)
      .filter(Boolean)
      .map((value) => ({
        value,
        label: priorityLabelFromValue(value),
        dotClass: priorityDotClass(value),
        count: filterableIssues.filter((issue) => normalizePriorityValue(issue?.priority, issue?.difficulty) === value).length
      }))
      .filter((option) => option.count > 0 || PRIORITY_FILTER_ORDER.includes(option.value))
      .sort((a, b) => PRIORITY_FILTER_ORDER.indexOf(a.value) - PRIORITY_FILTER_ORDER.indexOf(b.value))
  }, [filterableIssues])
  const assigneeFilterOptions = useMemo(() => {
    const options = new Map()
    filterableIssues.forEach((issue) => {
      const label = (issue?.assigneeName || issue?.assignee || issue?.assigneeEmail || '').toString().trim()
      const value = normalizeProjectMatchValue(label)
      if (!label || !value) return
      if (!options.has(value)) {
        options.set(value, {
          value,
          label,
          initials: getInitials(label),
          count: 0
        })
      }
      options.get(value).count += 1
    })
    return Array.from(options.values()).sort((a, b) => compareFilterLabels(a.label, b.label))
  }, [filterableIssues])
  const projectFilterOptions = useMemo(() => {
    const counts = new Map()
    filterableIssues.forEach((issue) => {
      const value = normalizeProjectMatchValue(issueProjectKeyFrom(issue))
      if (!value) return
      counts.set(value, (counts.get(value) || 0) + 1)
    })
    return projects
      .map((projectItem) => {
        const key = projectKeyFrom(projectItem)
        const value = normalizeProjectMatchValue(key)
        if (!value) return null
        return {
          value,
          label: formatProjectLabel(projectItem),
          count: counts.get(value) || 0
        }
      })
      .filter(Boolean)
      .filter((option) => option.count > 0 || selectedFilters.project.includes(option.value))
      .sort((a, b) => compareFilterLabels(a.label, b.label))
  }, [filterableIssues, projects, selectedFilters.project])
  const sprintFilterOptions = useMemo(() => {
    const counts = new Map()
    filterableIssues.forEach((issue) => {
      const value = normalizeProjectMatchValue(issue?.sprintId || issue?.sprint)
      if (!value) return
      counts.set(value, (counts.get(value) || 0) + 1)
    })
    const selectedSprintValues = new Set(selectedFilters.sprint)
    const optionValues = new Set([...counts.keys(), ...selectedSprintValues])
    return Array.from(optionValues)
      .map((value) => {
        const sprintDetails = sprintLookupById.get(value)
        return {
          value,
          label: sprintDetails?.label || 'Untitled sprint',
          meta: sprintDetails?.meta || '',
          count: counts.get(value) || 0
        }
      })
      .filter((option) => option.count > 0 || selectedSprintValues.has(option.value))
      .sort((a, b) => compareFilterLabels(a.label, b.label))
  }, [filterableIssues, selectedFilters.sprint, sprintLookupById])
  // load counts for dashboard summary
  useEffect(()=>{
    async function loadCounts(){
      try{
        if (!user?.id) {
          setTotalIssues(0)
          setDifficultyCounts({ High:0, Medium:0, Low:0 })
          setTaskCounts({ todo: 0, progress: 0, review: 0, done: 0 })
          setOverdueTasks([])
          setRecentActivities([])
          setDashboardIssues([])
          return
        }
        if (projectsLoading && !projects.length) return
        const res = await fetch(`${API_BASE}/api/issues`, { headers: { 'X-USER-ID': String(user.id) } })
        if(!res.ok) throw new Error('failed to fetch')
        const data = await res.json()
        const parsed = Array.isArray(data) ? data.map(d => ({ ...d })) : []
        const orgProjectKeys = new Set((projects || []).map(projectKeyFrom).filter(Boolean).map((key) => key.toUpperCase()))
        const shouldFilterByOrg = Boolean(selectedOrg)
        const orgScoped = shouldFilterByOrg
          ? parsed.filter((it) => {
            const key = issueProjectKeyFrom(it)
            return key && orgProjectKeys.has(key)
          })
          : parsed
        const managedProjectScoped = orgProjectKeys.size
          ? parsed.filter((issue) => {
            const key = issueProjectKeyFrom(issue)
            return key && orgProjectKeys.has(key)
          })
          : orgScoped
        let assignedScoped = []
        const hasTeamScope = isProjectManager || isTester
        if (hasTeamScope) {
          const orgProjects = shouldFilterByOrg
            ? (projects || []).filter((projectItem) => {
              const key = projectKeyFrom(projectItem)
              return key && orgProjectKeys.has(key.toUpperCase())
            })
            : (projects || [])
          const teamMemberEmails = new Set()
          const teamMemberNames = new Set()
          orgProjects.forEach((projectItem) => {
            const members = Array.isArray(projectItem?.teamMembers) ? projectItem.teamMembers : []
            members.forEach((member) => {
              const email = (member?.email || '').toString().trim().toLowerCase()
              if (email) teamMemberEmails.add(email)
              const name = (member?.name || '').toString().trim().toLowerCase()
              if (name) teamMemberNames.add(name)
            })
            const managerEmail = (projectItem?.managerEmail || '').toString().trim().toLowerCase()
            if (managerEmail) teamMemberEmails.add(managerEmail)
            const teamLead = (projectItem?.teamLead || '').toString().trim()
            if (teamLead) {
              const normalizedLead = teamLead.toLowerCase()
              if (normalizedLead.includes('@')) teamMemberEmails.add(normalizedLead)
              else teamMemberNames.add(normalizedLead)
            }
          })

          if (teamMemberEmails.size === 0 && teamMemberNames.size === 0) {
            assignedScoped = orgScoped.filter((issue) => isAssignedToUser(issue) || isCreatedByUser(issue))
          } else {
            assignedScoped = orgScoped.filter((issue) => {
              const assigneeEmail = (issue.assigneeEmail || '').toString().toLowerCase()
              if (assigneeEmail && teamMemberEmails.has(assigneeEmail)) return true
              const assigneeField = (issue.assignee || '').toString().toLowerCase()
              if (assigneeField && teamMemberEmails.has(assigneeField)) return true
              const assigneeName = (issue.assigneeName || issue.assignee || '').toString().trim().toLowerCase()
              if (assigneeName && teamMemberNames.has(assigneeName)) return true
              return false
            })
          }
        } else {
          assignedScoped = orgScoped.filter((issue) => isAssignedToUser(issue) || isCreatedByUser(issue))
        }
        const personalScoped = orgScoped.filter((issue) => isAssignedToUser(issue) || isCreatedByUser(issue))
        const usePersonalScopeForCounts = isProjectManager || isTester
        const scopedForTotals = usePersonalScopeForCounts ? personalScoped : assignedScoped
        const scopedForTasks = usePersonalScopeForCounts ? personalScoped : assignedScoped

        setDashboardIssues(orgScoped)
        setTotalIssues(scopedForTotals.length)
        const counts = { High:0, Medium:0, Low:0 }
        scopedForTotals.forEach(it => {
          const diff = (it.difficulty || '').toString()
          if(diff.toLowerCase()==='high') counts.High++
          else if(diff.toLowerCase()==='medium') counts.Medium++
          else if(diff.toLowerCase()==='low') counts.Low++
        })
        setDifficultyCounts(counts)

        const nextTaskCounts = { todo: 0, progress: 0, review: 0, done: 0 }
        const today = formatDateForInput(new Date())
        const nextOverdue = []
        scopedForTasks.forEach((it) => {
          const status = normalizeStatus(it.status)
          if (status === 'todo') nextTaskCounts.todo += 1
          else if (status === 'progress') nextTaskCounts.progress += 1
          else if (status === 'review') nextTaskCounts.review += 1
          else if (status === 'done') nextTaskCounts.done += 1
        })
        const overdueScope = isProjectManager
          ? managedProjectScoped
          : orgScoped.filter((issue) => isAssignedToUser(issue))
        overdueScope.forEach((it) => {
          const status = normalizeStatus(it.status)
          const rawDeadline = it.deadlineDate ?? it.dueDate ?? it.deadline
          const deadline = normalizeDeadlineDate(rawDeadline)
          if (deadline && deadline < today && status !== 'done') {
            nextOverdue.push({
              id: (it.issueKey || it.key || it.id || '').toString(),
              title: (it.summary || it.title || 'Untitled issue').toString(),
              projectKey: (it.project || '').toString().trim().toUpperCase(),
              deadlineDate: deadline
            })
          }
        })
        nextOverdue.sort((a, b) => (a.deadlineDate || '').localeCompare(b.deadlineDate || ''))
        setTaskCounts(nextTaskCounts)
        setOverdueTasks(nextOverdue)

        const nextActivities = scopedForTasks
          .slice()
          .sort((a, b) => {
            const ad = parseBackendDate(a?.updatedAt || a?.createdAt)
            const bd = parseBackendDate(b?.updatedAt || b?.createdAt)
            return (bd?.getTime() || 0) - (ad?.getTime() || 0)
          })
          .slice(0, 6)
          .map((it) => {
            const key = (it.issueKey || it.key || it.id || '').toString().trim()
            const issueType = (it.issueType || it.type || 'task').toString().trim()
            const assignee = (it.assigneeName || it.assignee || it.creatorName || it.assigneeEmail || 'Unassigned').toString()
            const priorityOrDifficulty = (it.priority || it.difficulty || '').toString().toLowerCase().trim()
            return {
              key: key || String(it.id || ''),
              title: (it.summary || it.title || 'Untitled issue').toString(),
              type: issueType.toLowerCase(),
              assignee,
              statusLabel: statusLabelFromStatus(it.status),
              dotColor: ['critical', 'high'].includes(priorityOrDifficulty) ? 'red' : 'orange',
              projectKey: (it.project || '').toString().trim().toUpperCase()
            }
        })
        setRecentActivities(nextActivities)
      }catch(e){ console.error('load dashboard counts failed', e) }
    }
    loadCounts()
  },[API_BASE, isAssignedToUser, isCreatedByUser, isProjectManager, isTester, normalizedUserName, projects, projectsLoading, selectedOrg, userEmail, user?.id])

  function handleLogout() {
    // clear user and force replace to login so back won't return to protected page
    clearUser()
    navigate('/login', { replace: true })
  }

  function openBoardByStatus(statusKey) {
    const normalized = (statusKey || '').toString().trim().toLowerCase()
    if (!normalized) return
    navigate(`/all-my-issues?status=${encodeURIComponent(normalized)}`)
  }

  function openProjectBoard(project) {
    const projectKey = project.projectKey || project.id
    if (!projectKey) return
    navigate(`/projects/${projectKey}/board`, {
      state: { project: { ...project, id: projectKey, projectKey } }
    })
  }

  function openActiveSprint() {
    const projectItem = sprintCardProject || activeProjects[0]
    if (!projectItem) return
    const projectKey = projectItem.projectKey || projectItem.id
    if (!projectKey) return
    navigate(`/projects/${projectKey}/backlog`, {
      state: { project: { ...projectItem, id: projectKey, projectKey } }
    })
  }

  function openIssueFromActivity(issueKey, projectKeyOverride) {
    if (!issueKey) return
    const override = (projectKeyOverride || '').toString().trim()
    const fallbackProject = activeProjects[0]?.projectKey || activeProjects[0]?.id || ''
    const projectKey = (override || fallbackProject).toString().trim()
    if (!projectKey) {
      navigate(`/all-my-issues?q=${encodeURIComponent(issueKey)}`)
      return
    }
    navigate(`/projects/${projectKey}/board?issue=${encodeURIComponent(issueKey)}`)
  }

  function openAdminNotification(notificationText) {
    if (!notificationText) return
    const target = notificationText.toString().trim()
    if (!target) return
    navigate(`/all-my-issues?q=${encodeURIComponent(target)}`)
  }

  function openAdminAnnouncement(announcementText) {
    if (!announcementText) return
    const target = announcementText.toString().trim()
    if (!target) return
    navigate(`/all-my-issues?q=${encodeURIComponent(target)}`)
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

  function toggleFilterSelection(group, value) {
    setSelectedFilters((prev) => {
      const exists = prev[group].includes(value)
      return {
        ...prev,
        [group]: exists
          ? prev[group].filter((item) => item !== value)
          : [...prev[group], value]
      }
    })
  }

  function clearAllFilters() {
    setSelectedFilters(createEmptyFilters())
  }

  function getFilterSummary(filters) {
    const parts = []
    if (filters.status.length) parts.push(`${filters.status.length} status`)
    if (filters.issueType.length) parts.push(`${filters.issueType.length} issue type`)
    if (filters.sprint.length) parts.push(`${filters.sprint.length} sprint`)
    if (filters.priority.length) parts.push(`${filters.priority.length} priority`)
    if (filters.assignee.length) parts.push(`${filters.assignee.length} assignee`)
    if (filters.project.length) parts.push(`${filters.project.length} project`)
    if (filters.dueFrom || filters.dueTo) parts.push('deadline range')
    return parts.length ? parts.join(', ') : 'No filters selected'
  }

  function saveCurrentFilter() {
    if (activeFilterCount === 0) return
    const normalizedCriteria = normalizeFilterCriteria(selectedFilters)
    const newFilter = {
      id: Date.now(),
      name: `Custom Filter ${savedFilters.length + 1}`,
      description: getFilterSummary(normalizedCriteria),
      criteria: normalizedCriteria
    }
    const updated = [newFilter, ...savedFilters]
    setSavedFilters(updated)
    try {
      localStorage.setItem('dashboardSavedFilters', JSON.stringify(updated))
    } catch (err) {
      console.error('failed to save filter', err)
    }
    setShowFilters(false)
  }

  function closeCreateModal() {
    setShowCreate(false)
    setAssigneeDropdownOpen(false)
    if (location.pathname === '/create-issue') {
      navigate('/dashboard', { replace: true })
    }
  }

  function applyFiltersToIssues() {
    const params = new URLSearchParams()
    if (selectedFilters.status.length) params.set('status', selectedFilters.status.join(','))
    if (selectedFilters.issueType.length) params.set('issueType', selectedFilters.issueType.join(','))
    if (selectedFilters.sprint.length) params.set('sprint', selectedFilters.sprint.join(','))
    if (selectedFilters.priority.length) params.set('priority', selectedFilters.priority.join(','))
    if (selectedFilters.assignee.length) params.set('assignee', selectedFilters.assignee.join(','))
    if (selectedFilters.project.length) params.set('project', selectedFilters.project.join(','))
    if (selectedFilters.dueFrom) params.set('dueFrom', selectedFilters.dueFrom)
    if (selectedFilters.dueTo) params.set('dueTo', selectedFilters.dueTo)
    const query = params.toString()
    navigate(query ? `/all-my-issues?${query}` : '/all-my-issues')
    setShowFilters(false)
  }

  function runIssueSearch(queryText = topSearchText) {
    const query = (queryText || '').trim()
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

  const adminPendingApprovals = useMemo(
    () => (Array.isArray(adminOverview?.pendingApprovals) ? adminOverview.pendingApprovals : []),
    [adminOverview]
  )
  const adminProjectOverview = useMemo(
    () => (Array.isArray(adminOverview?.projectOverview) ? adminOverview.projectOverview : []),
    [adminOverview]
  )
  const adminProjectHighlights = useMemo(
    () => (Array.isArray(adminOverview?.projectHighlights) ? adminOverview.projectHighlights : []),
    [adminOverview]
  )
  const adminNotificationTitles = useMemo(
    () => (Array.isArray(adminOverview?.systemNotifications)
      ? adminOverview.systemNotifications
      : (Array.isArray(notifications) ? notifications.map((n) => n.title) : [])),
    [adminOverview, notifications]
  )

  const adminAnnouncementItems = useMemo(
    () => (Array.isArray(adminOverview?.announcements) ? adminOverview.announcements : []),
    [adminOverview]
  )

  const projectOverviewRows = useMemo(() => {
    const defaultRows = {
      active: { label: 'Active Projects', count: 0, ownerName: '', ownerEmail: '' },
      completed: { label: 'Completed Projects', count: 0, ownerName: '', ownerEmail: '' },
      onHold: { label: 'On Hold Projects', count: 0, ownerName: '', ownerEmail: '' }
    }

    const apiRows = (Array.isArray(adminProjectOverview) ? adminProjectOverview : [])
      .map((item) => {
        const statusKey = getProjectOverviewStatusKeyFromLabel(item?.label)
        const count = Number(item?.count)
        return {
          statusKey,
          label: defaultRows[statusKey]?.label || (item?.label || '').toString().trim() || 'Active Projects',
          count: Number.isFinite(count) ? count : 0,
          ownerName: (item?.ownerName || '').toString().trim(),
          ownerEmail: (item?.ownerEmail || '').toString().trim()
        }
      })
      .filter((item) => item.statusKey && item.label)

    if (apiRows.length) {
      apiRows.forEach((item) => {
        defaultRows[item.statusKey] = {
          ...defaultRows[item.statusKey],
          label: item.label,
          count: item.count,
          ownerName: item.ownerName,
          ownerEmail: item.ownerEmail
        }
      })
      return [defaultRows.active, defaultRows.completed, defaultRows.onHold]
    }

    const projectList = Array.isArray(projects) ? projects : []
    if (projectList.length) {
      const ownerBuckets = {
        active: new Map(),
        completed: new Map(),
        onHold: new Map()
      }

      projectList.forEach((project) => {
        const statusKey = getProjectStatusKey(project)
        if (!defaultRows[statusKey]) return
        defaultRows[statusKey].count += 1

        const ownerName = (project?.teamLead || '').toString().trim()
        const ownerEmail = (project?.managerEmail || '').toString().trim()
        const ownerKey = (ownerEmail || ownerName).toLowerCase()
        if (!ownerKey) return

        const existing = ownerBuckets[statusKey].get(ownerKey) || { count: 0, ownerName, ownerEmail }
        existing.count += 1
        if (!existing.ownerName && ownerName) existing.ownerName = ownerName
        if (!existing.ownerEmail && ownerEmail) existing.ownerEmail = ownerEmail
        ownerBuckets[statusKey].set(ownerKey, existing)
      })

      ;['active', 'completed', 'onHold'].forEach((statusKey) => {
        const entries = Array.from(ownerBuckets[statusKey].values())
        if (!entries.length) return
        entries.sort((a, b) => b.count - a.count)
        defaultRows[statusKey].ownerName = entries[0].ownerName
        defaultRows[statusKey].ownerEmail = entries[0].ownerEmail
      })

      return [defaultRows.active, defaultRows.completed, defaultRows.onHold]
    }

    defaultRows.active.count = Number(adminOverview?.activeProjects ?? 0) || 0
    defaultRows.completed.count = Number(adminOverview?.completedProjects ?? 0) || 0
    defaultRows.onHold.count = Number(adminOverview?.onHoldProjects ?? 0) || 0
    return [defaultRows.active, defaultRows.completed, defaultRows.onHold]
  }, [adminOverview, adminProjectOverview, projects])

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
              <NavLink to="/role-management" className={({isActive})=> `nav-item d-flex align-items-center mb-2 ${isActive? 'active':''}`}>
                <FiShield className="me-3 nav-icon"/> <span className="nav-text">Role Management</span>
              </NavLink>
              <NavLink to="/settings" className={({isActive})=> `nav-item d-flex align-items-center mb-2 ${isActive? 'active':''}`}>
                <FiSettings className="me-3 nav-icon"/> <span className="nav-text">Settings</span>
              </NavLink>
            </nav>
          </div>

          <div className="sidebar-footer mt-3 d-flex flex-column align-items-start">
            <div className="profile d-flex align-items-center w-100">
              <div className="avatar-icon">
            {avatar ? <img src={avatar} alt="avatar" /> : avatarInitials}
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

      {/* floating toggle (uses same button for large and small screens) - removed separate floating button */}

      {/* mobile toggle (visible on small/medium screens) - also toggles collapsed on large screens */}
      <button className="mobile-toggle btn btn-sm" onClick={toggleSidebarForScreen} aria-label="Toggle sidebar">
        <FiMenu size={18} />
      </button>

      <div className={`mobile-overlay ${mobileOpen ? 'show' : ''}`} onClick={() => { setMobileOpen(false); setCollapsed(true) }} />

      <main className={`content flex-grow-1 p-4 ${collapsed ? 'with-topbar' : ''}`}>
        {isAdmin ? (
          <div className="admin-dashboard-content">
            <div className="admin-dashboard-header d-flex align-items-start justify-content-between flex-wrap">
              <div>
                <span className="admin-dashboard-label">Admin dashboard</span>
                <h1 className="admin-dashboard-title mb-1">Dashboard</h1>
                <p className="admin-dashboard-subtitle">Welcome back! Here's what's happening with your system.</p>
              </div>
              <div className="admin-dashboard-actions d-flex align-items-center gap-2 flex-wrap">
                <div
                  className={`input-group top-search-medium admin-search-input ${mobileSearchOpen ? 'mobile-open' : ''}`}
                  onClick={() => {
                    if (isMobileScreen() && !mobileSearchOpen) {
                      setMobileSearchOpen(true)
                      return
                    }
                    topSearchInputRef.current?.focus()
                  }}
                >
                  <button type="button" className="input-group-text" onClick={handleTopSearchIconClick} aria-label="Search">
                    <FiSearch />
                  </button>
                  <input
                    ref={topSearchInputRef}
                    className="form-control"
                    placeholder="Search issues, projects..."
                    aria-label="Search issues"
                    value={topSearchText}
                    onChange={(event) => setTopSearchText(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') runIssueSearch()
                    }}
                  />
                </div>
                <button className="admin-create-btn" type="button" onClick={handleCreateUserClick}>
                  <FiPlus className="me-1" /> Create User
                </button>
              </div>
            </div>
            {adminLoading && <div className="admin-loading-state">Loading admin overview...</div>}
            {adminError && <div className="admin-error-state">{adminError}</div>}
            <div className="admin-stats-grid">
              {[
                { label: 'Users', value: adminOverview?.totalUsers ?? 0, Icon: FiUsers, variant: 'blue', clickHandler: goToTeamsPage },
                { label: 'Active Projects', value: adminOverview?.activeProjects ?? 0, Icon: FiFolder, variant: 'green', clickHandler: goToProjectsPage },
                { label: 'Teams', value: adminOverview?.totalTeams ?? 0, Icon: FiClipboard, variant: 'orange', clickHandler: handleTeamsStatClick },
                { label: 'Pending Requests', value: adminOverview?.pendingRequests ?? 0, Icon: FiBell, variant: 'red', clickHandler: handlePendingRequestsClick }
              ].map(({ label, value, Icon, variant, clickHandler }) => {
                const isClickable = typeof clickHandler === 'function'
                const IconComponent = Icon
                return (
                  <article
                    key={label}
                    className={`admin-stat-card admin-stat-${variant}${isClickable ? ' admin-stat-clickable' : ''}`}
                    role={isClickable ? 'button' : undefined}
                    tabIndex={isClickable ? 0 : undefined}
                    onClick={isClickable ? clickHandler : undefined}
                    onKeyDown={isClickable ? (event) => handleStatKeyDown(event, clickHandler) : undefined}
                  >
                  <div className="admin-stat-icon">
                    <IconComponent />
                  </div>
                  <div>
                    <p className="admin-stat-label">{label}</p>
                    <h3 className="admin-stat-value">{value}</h3>
                  </div>
                </article>
              )
            })}
            </div>
            <div className="admin-card-grid admin-card-grid-primary">
              <section className="admin-card user-management-card">
                <div className="admin-card-header">
                  <h5>User Management</h5>
                  <p className="small-muted">Quick access to controls</p>
                </div>
                <div className="admin-actions-grid">
                  <button
                    className={`admin-action primary ${activeUserAction === 'manage' ? 'active-action' : ''}`}
                    type="button"
                    onClick={handleAdminActionClick('manage', '/teams')}
                    aria-pressed={activeUserAction === 'manage'}
                  >
                    <FiUsers className="me-2" /> Manage Users
                    <FiChevronDown className="action-arrow" aria-hidden="true" />
                  </button>
                  <button
                    className={`admin-action secondary ${activeUserAction === 'role' ? 'active-action' : ''}`}
                    type="button"
                    onClick={handleAdminActionClick('role', '/role-management')}
                    aria-pressed={activeUserAction === 'role'}
                  >
                    <FiShield className="me-2" /> Role Management
                    <FiChevronDown className="action-arrow" aria-hidden="true" />
                  </button>
                  <button
                    className={`admin-action secondary ${activeUserAction === 'logs' ? 'active-action' : ''}`}
                    type="button"
                    onClick={handleAdminActionClick('logs', '/reports')}
                    aria-pressed={activeUserAction === 'logs'}
                  >
                    <FiClipboard className="me-2" /> Activity Logs
                    <FiChevronDown className="action-arrow" aria-hidden="true" />
                  </button>
                  <button
                    className={`admin-action secondary ${activeUserAction === 'reports' ? 'active-action' : ''}`}
                    type="button"
                    onClick={handleAdminActionClick('reports', '/reports')}
                    aria-pressed={activeUserAction === 'reports'}
                  >
                    <FiBarChart2 className="me-2" /> Reports
                    <FiChevronDown className="action-arrow" aria-hidden="true" />
                  </button>
                </div>
                {activeUserAction === 'manage' && (
                  <div className="user-management-list">
                    {userManagementLoading && (
                      <div className="user-list-message">Loading users…</div>
                    )}
                    {!userManagementLoading && userManagementError && (
                      <div className="user-list-message text-danger">{userManagementError}</div>
                    )}
                    {!userManagementLoading && !userManagementError && adminUserList.length === 0 && (
                      <div className="user-list-message">No users found yet.</div>
                    )}
                    {!userManagementLoading && adminUserList.length > 0 && (
                      <div className="user-rows">
                        {adminUserList.map((usr) => (
                          <div className="user-row" key={usr.id || usr.email}>
                            <div>
                              <div className="user-name">{usr.name || usr.email}</div>
                              <div className="user-email">{usr.email}</div>
                            </div>
                            <span className="user-role-badge">{usr.role || 'Member'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </section>
              <section className="admin-card project-overview-card">
                <div className="admin-card-header">
                  <h5>Project Overview</h5>
                  <p className="small-muted">Status breakdown</p>
                </div>
                <div className="project-status-list">
                  {projectOverviewRows.map((status) => (
                    <div className="project-status-row" key={status.label}>
                      <div>
                        <div className="project-status-label">{status.label}</div>
                        {(status.ownerName || status.ownerEmail) && (
                          <div className="project-status-owner">Managed by {status.ownerName || status.ownerEmail}</div>
                        )}
                      </div>
                      <div className="project-status-meta">
                        <span className="project-status-count">{status.count}</span>
                      <div className="project-status-actions">
                        <button className="admin-status-btn approve" type="button">Approve</button>
                        <button className="admin-status-btn reject" type="button">Reject</button>
                        {isAdmin && status.ownerEmail && (
                          <button
                            className="admin-status-btn view-team"
                            type="button"
                            onClick={() => handleViewTeam(status.ownerEmail, status.ownerName)}
                          >
                            View team
                          </button>
                        )}
                      </div>
                    </div>
                    </div>
                  ))}
                </div>
                <div className="admin-card-footer">
                  <button className="btn admin-ghost-btn" type="button" onClick={() => navigate('/projects')}>Manage Projects</button>
                </div>
              </section>
            </div>
            <div className="admin-card-grid admin-card-grid-secondary">
              <section className="admin-card pending-card">
                <div className="admin-card-header">
                  <h5>Pending Approvals</h5>
                  <p className="small-muted">Requests awaiting approval</p>
                </div>
                <ul className="pending-list">
                  {adminPendingApprovals.length ? adminPendingApprovals.slice(0, 4).map((item, index) => (
                    <li key={`${item.memberEmail || index}-${index}`}>
                      <div className="pending-details">
                        <strong>{item.memberName || item.memberEmail || 'Member'}</strong>
                        <span>{item.projectName || item.projectKey}</span>
                      </div>
                      <span className="pending-status">{item.status}</span>
                    </li>
                  )) : (
                    <li className="muted">No pending approvals yet.</li>
                  )}
                </ul>
              </section>
              <section className="admin-card notifications-card">
                <div className="admin-card-header">
                  <h5>System Notifications</h5>
                  <p className="small-muted">Recent alerts</p>
                </div>
                <ul className="notification-list">
                  {adminLoading ? (
                    <li className="muted">Loading notifications...</li>
                  ) : (adminNotificationTitles && adminNotificationTitles.length > 0) ? (
                    adminNotificationTitles.filter(Boolean).slice(0, 4).map((note, index) => (
                      <li
                        key={`${note}-${index}`}
                        role="button"
                        tabIndex={0}
                        className="clickable-item"
                        onClick={() => openAdminNotification(note)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            openAdminNotification(note)
                          }
                        }}
                      >
                        {note}
                      </li>
                    ))
                  ) : (
                    <li className="muted">No system notifications yet.</li>
                  )}
                </ul>
              </section>
            </div>
            <div className="admin-card-grid admin-card-grid-secondary">
              <section className="admin-card highlights-card">
                <div className="admin-card-header">
                  <h5>Project Highlights</h5>
                  <p className="small-muted">Top performers</p>
                </div>
                <div className="highlight-list">
                  {adminProjectHighlights.length ? adminProjectHighlights.map((highlight) => (
                    <div className="highlight-row" key={highlight.projectId || highlight.projectKey}>
                      <div>
                        <div className="highlight-title">{highlight.name || highlight.projectKey}</div>
                        <div className="muted">{highlight.status} · {highlight.managerName || highlight.leadName || 'Team'}</div>
                      </div>
                      <div className="highlight-progress-track">
                        <div
                          className="highlight-progress-fill"
                          style={{ width: `${Math.min(Math.max(highlight.completionPct || 0, 0), 100)}%` }}
                        />
                      </div>
                      <span className="highlight-pct">{highlight.completionPct ?? 0}%</span>
                    </div>
                  )) : (
                    <div className="muted">Highlights appear once projects report status.</div>
                  )}
                </div>
              </section>
              <section className="admin-card announcements-card">
                <div className="admin-card-header">
                  <h5>Announcements</h5>
                  <p className="small-muted">Important notes</p>
                </div>
                <ul className="announcement-list">
                  {adminLoading ? (
                    <li className="muted">Loading announcements...</li>
                  ) : (adminAnnouncementItems && adminAnnouncementItems.length > 0) ? (
                    adminAnnouncementItems.filter(Boolean).slice(0, 4).map((item, index) => (
                      <li
                        key={`${item}-${index}`}
                        role="button"
                        tabIndex={0}
                        className="clickable-item"
                        onClick={() => openAdminAnnouncement(item)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            openAdminAnnouncement(item)
                          }
                        }}
                      >
                        {item}
                      </li>
                    ))
                  ) : (
                    <li className="muted">No announcements yet.</li>
                  )}
                </ul>
              </section>
            </div>
          </div>
        ) : (
          <>
        <header className="dash-header mb-4">
          <div>
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
                  aria-label="Search projects and issues"
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
                <button
                  className={`btn btn-link bell-black ${unreadCount > 0 ? 'has-unread' : ''}`}
                  title="Notifications"
                  onClick={toggleNotifications}
                >
                  <FiBell size={20} />
                  {unreadCount > 0 && <span className="notif-count">{unreadCount}</span>}
                </button>

                {showNotifications && (
                  <div className="notification-dropdown">
                    <div className="notification-header">
                      <span>Notifications</span>
                      {(unreadCount > 0 || notifications.length > 0) && (
                        <div className="notification-actions">
                          {unreadCount > 0 && (
                            <button className="mark-all-btn" type="button" onClick={markAllNotificationsAsRead}>
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
                      {!notificationsLoading && notifications.length > 0 && notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`notification-item-row ${n.read ? 'read' : 'unread'}`}
                          data-variant={n.variant}
                          onClick={() => {
                            markNotificationAsRead(n.id)
                            setShowNotifications(false)
                            if (n.href) navigate(n.href)
                          }}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              markNotificationAsRead(n.id)
                              setShowNotifications(false)
                              if (n.href) navigate(n.href)
                            }
                          }}
                        >
                          <div className="notification-item-body">
                            <div className="notification-title">{n.title}</div>
                            <div className="notification-time">{n.time}</div>
                          </div>
                          <button
                            type="button"
                            className="notification-dismiss-btn"
                            aria-label="Dismiss notification"
                            onClick={(event) => {
                              event.stopPropagation()
                              dismissNotification(n.id)
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
            <button className="btn create-issue-medium" onClick={() => setShowCreate(true)}>
              <FiPlus className="me-1" /> Create Issue
            </button>
          )}
            </div>

            <h1 className="mb-0">Dashboard</h1>
            <div className="text-muted">Welcome back! Here's what's happening with your projects.</div>
          </div>
          <div className="d-flex align-items-center gap-2 mt-3">
            <div className="search-input input-group">
              <span className="input-group-text" role="button" tabIndex={0} onClick={() => runIssueSearch(dashboardSearchText)} onKeyDown={(event) => { if (event.key === 'Enter') runIssueSearch(dashboardSearchText) }}><FiSearch /></span>
              <input
                className="form-control"
                placeholder="Search issues by title, key, description..."
                value={dashboardSearchText}
                onChange={(event) => setDashboardSearchText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') runIssueSearch(dashboardSearchText)
                }}
              />
            </div>
            <button className="btn btn-outline-secondary" onClick={() => setShowFilters(true)}>
              Filters
            </button>
          </div>
        </header>

        {showFilters && (
          <div className="filters-modal-overlay" onClick={() => setShowFilters(false)}>
            <div className="filters-modal" role="dialog" aria-modal="true" onClick={(e)=>e.stopPropagation()}>
              <div className="filters-modal-header d-flex align-items-start">
                <div>
                  <h5><FiFilter className="me-2" /> Advanced Filters</h5>
                  <p className="muted">
                    Refine {filterableIssues.length} accessible issue{filterableIssues.length === 1 ? '' : 's'} using live project data.
                  </p>
                </div>
                <button className="btn modal-close filters-modal-close" onClick={() => setShowFilters(false)} aria-label="Close"><FiX size={18} /></button>
              </div>

              <div className="filters-body">
                <div className="filters-grid">
                  <div className="filters-column">
                    <div className="filter-section">
                      <h6>Status</h6>
                      <div className="filter-list">
                        {statusFilterOptions.map((option) => (
                          <label key={option.value} className={`filter-option ${selectedFilters.status.includes(option.value) ? 'is-selected' : ''}`}>
                            <input
                              type="checkbox"
                              checked={selectedFilters.status.includes(option.value)}
                              onChange={() => toggleFilterSelection('status', option.value)}
                            />
                            <span className="filter-option-content">
                              <span className="filter-option-label">{option.label}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="filter-section">
                      <h6>Issue Type</h6>
                      <div className="filter-list">
                        {issueTypeFilterOptions.map((option) => (
                          <label key={option.value} className={`filter-option ${selectedFilters.issueType.includes(option.value) ? 'is-selected' : ''}`}>
                            <input
                              type="checkbox"
                              checked={selectedFilters.issueType.includes(option.value)}
                              onChange={() => toggleFilterSelection('issueType', option.value)}
                            />
                            <span className="filter-option-content">
                              <span className="filter-option-label">{option.label}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="filter-section">
                      <h6>Sprint</h6>
                      <div className="filter-list">
                        {sprintsLoading && <div className="empty-filter-state">Loading sprints...</div>}
                        {!sprintsLoading && sprintFilterOptions.length === 0 && (
                          <div className="empty-filter-state">No sprint-linked issues are available in this workspace yet.</div>
                        )}
                        {!sprintsLoading && sprintFilterOptions.map((option) => (
                          <label key={option.value} className={`filter-option ${selectedFilters.sprint.includes(option.value) ? 'is-selected' : ''}`}>
                            <input
                              type="checkbox"
                              checked={selectedFilters.sprint.includes(option.value)}
                              onChange={() => toggleFilterSelection('sprint', option.value)}
                            />
                            <span className="filter-option-content">
                              <span className="filter-option-label">{option.label}</span>
                              {option.meta && <span className="filter-option-meta">{option.meta}</span>}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="filters-column">
                    <div className="filter-section">
                      <h6>Priority</h6>
                      <div className="filter-list priority-list">
                        {priorityFilterOptions.map((option) => (
                          <label key={option.value} className={`filter-option ${selectedFilters.priority.includes(option.value) ? 'is-selected' : ''}`}>
                            <input
                              type="checkbox"
                              checked={selectedFilters.priority.includes(option.value)}
                              onChange={() => toggleFilterSelection('priority', option.value)}
                            />
                            <span className={`dot ${option.dotClass}`} />
                            <span className="filter-option-content">
                              <span className="filter-option-label">{option.label}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="filter-section">
                      <h6>Assignee</h6>
                      <div className="filter-list assignee-list">
                        {assigneeFilterOptions.length === 0 && (
                          <div className="empty-filter-state">No assignees found in your current issue list.</div>
                        )}
                        {assigneeFilterOptions.map((option) => (
                          <label key={option.value} className={`filter-option ${selectedFilters.assignee.includes(option.value) ? 'is-selected' : ''}`}>
                            <input
                              type="checkbox"
                              checked={selectedFilters.assignee.includes(option.value)}
                              onChange={() => toggleFilterSelection('assignee', option.value)}
                            />
                            <span className="small-avatar">{option.initials}</span>
                            <span className="filter-option-content">
                              <span className="filter-option-label">{option.label}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="filter-section">
                      <h6>Project</h6>
                      <div className="filter-list project-list">
                        {projectsLoading && <div className="muted">Loading projects...</div>}
                        {!projectsLoading && projectFilterOptions.length === 0 && (
                          <div className="muted">{projectsError || 'No project-specific issues found yet'}</div>
                        )}
                        {!projectsLoading && projectFilterOptions.map((option) => (
                            <label key={option.value} className={`filter-option ${selectedFilters.project.includes(option.value) ? 'is-selected' : ''}`}>
                              <input
                                type="checkbox"
                                checked={selectedFilters.project.includes(option.value)}
                                onChange={() => toggleFilterSelection('project', option.value)}
                              />
                              <span className="filter-option-content">
                                <span className="filter-option-label">{option.label}</span>
                              </span>
                            </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="divider" />

                <div className="due-range-row d-flex gap-3">
                  <div className="due-col">
                    <div className="muted">Deadline Range</div>
                    <label className="small-muted">From</label>
                    <input
                      type="date"
                      className="date-input"
                      value={selectedFilters.dueFrom}
                      max={selectedFilters.dueTo || undefined}
                      onChange={(e) => setSelectedFilters(prev => ({ ...prev, dueFrom: e.target.value }))}
                    />
                  </div>
                  <div className="due-col mt-4">
                    <label className="small-muted">To</label>
                    <input
                      type="date"
                      className="date-input"
                      value={selectedFilters.dueTo}
                      min={selectedFilters.dueFrom || undefined}
                      onChange={(e) => setSelectedFilters(prev => ({ ...prev, dueTo: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="filters-modal-footer d-flex align-items-center">
                <button className="link-clear" onClick={clearAllFilters} type="button">Clear All Filters</button>
                <div className="ms-auto d-flex gap-3">
                  <button className="btn btn-outline-secondary" onClick={() => setShowFilters(false)}>Close</button>
                  <button className="btn btn-primary" onClick={applyFiltersToIssues} type="button">Apply Filters</button>
                  <button className="btn save-filter" onClick={saveCurrentFilter} disabled={activeFilterCount === 0}>Save Filter</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showCreate && (
          <div className="create-issue-overlay" onClick={closeCreateModal}>
            <div className="create-issue-container" role="dialog" aria-modal="true" onClick={e=>e.stopPropagation()}>
              <button type="button" className="btn modal-close create-issue-close" onClick={closeCreateModal} aria-label="Close" title="Close"><FiX size={18} /></button>
              <div className="create-issue-header d-flex align-items-center">
                <h4>Create issue</h4>
              </div>

              <form className="create-issue-form">
                <div className="form-row select-row">
                  <label>Project*</label>
                    <div className="select-control">
                      <select
                        className={`form-control project-select ${errors.project ? 'invalid' : ''}`}
                        value={project}
                        onChange={e=>{ setProject(e.target.value); setErrors(prev=>({...prev, project:undefined})) }}
                      >
                        {projectsLoading && <option value="">Loading projects...</option>}
                        {!projectsLoading && projects.length === 0 && (
                          <option value="">{projectsError || 'No projects available'}</option>
                        )}
                        {!projectsLoading && projects.map((projectItem) => {
                          const key = projectKeyFrom(projectItem)
                          if (!key) return null
                          return (
                            <option key={key} value={key}>
                              {formatProjectLabel(projectItem)}
                            </option>
                          )
                        })}
                      </select>
                    {errors.project && <div className="error-text">{errors.project}</div>}
                  </div>
                </div>

                <div className="form-row two-col">
                  <div>
                    <label className='mb-2'>Issue Type*</label>
                    <select className={`form-control ${errors.issueType ? 'invalid' : ''}`} value={issueType} onChange={e=>{ setIssueType(e.target.value); setErrors(prev=>({...prev, issueType:undefined})) }}>
                      <option>Epic</option>
                      <option>Story</option>
                      <option>Task</option>
                      <option>Bug</option>
                    </select>
                    {errors.issueType && <div className="error-text">{errors.issueType}</div>}
                  </div>

                  <div>
                    <label className='mb-2'>Epic Name*</label>
                    <input
                      className={`form-control ${errors.epicName ? 'invalid' : ''}`}
                      placeholder="Provide a short name to identify this epic."
                      value={epicName}
                      onChange={e=>{ setEpicName(stripLeadingSpace(e.target.value)); setErrors(prev=>({...prev, epicName:undefined})) }}
                      onKeyDown={preventLeadingSpace}
                    />
                    {errors.epicName && <div className="error-text">{errors.epicName}</div>}
                  </div>
                </div>

                <div className="form-row">
                  <label>Summary*</label>
                  <input
                    className={`form-control summary-input ${errors.summary ? 'invalid' : ''}`}
                    value={summary}
                    onChange={e=>{ setSummary(stripLeadingSpace(e.target.value)); setErrors(prev=>({...prev, summary:undefined})) }}
                    onKeyDown={preventLeadingSpace}
                  />
                  {errors.summary && <div className="error-text">{errors.summary}</div>}
                </div>

                <div className="form-row three-col">
                  <div>
                    <label>Assign Date</label>
                    <input
                      type="date"
                      className={`form-control ${errors.assignDate ? 'invalid' : ''}`}
                      value={assignDate}
                      min={todayDateValue}
                      onChange={(e) => {
                        setAssignDate(e.target.value)
                        setErrors(prev => ({ ...prev, assignDate: undefined }))
                      }}
                    />
                    {errors.assignDate && <div className="error-text">{errors.assignDate}</div>}
                  </div>
                  <div>
                    <label>Deadline Date</label>
                    <input
                      type="date"
                      className={`form-control ${errors.deadlineDate ? 'invalid' : ''}`}
                      value={deadlineDate}
                      min={assignDate || todayDateValue}
                      onChange={(e) => {
                        setDeadlineDate(e.target.value)
                        setErrors(prev => ({ ...prev, deadlineDate: undefined }))
                      }}
                    />
                    {errors.deadlineDate && <div className="error-text">{errors.deadlineDate}</div>}
                  </div>
                  <div className="assignee-field" ref={assigneeRef}>
                    <label>Assigned To</label>
                    <div className={`assignee-search ${assigneeDropdownOpen ? 'open' : ''}`}>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Search team member..."
                        value={assigneeSearch}
                        onFocus={() => setAssigneeDropdownOpen(true)}
                        onChange={(e) => {
                          setAssigneeSearch(e.target.value)
                          setAssignee(null)
                          setAssigneeDropdownOpen(true)
                        }}
                      />
                      {assigneeDropdownOpen && (
                        <div className="assignee-dropdown">
                          {filteredTeamMembers.length > 0 ? (
                            filteredTeamMembers.map((member) => (
                              <button
                                type="button"
                                key={`${member.email || member.name}`}
                                className="assignee-option"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  setAssignee(member)
                                  setAssigneeSearch(member.name || member.email)
                                  setAssigneeDropdownOpen(false)
                                }}
                              >
                                <span className="assignee-name">{member.name || 'Member'}</span>
                                {member.email && <span className="assignee-email">{member.email}</span>}
                              </button>
                            ))
                          ) : (
                            <div className="assignee-empty">
                              {project ? 'No team members for this project' : 'Select a project to see members'}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {assignee && (
                      <div className="assignee-selected">
                        <div className="assignee-selected-info">
                          <span className="assignee-name">{assignee.name || 'Member'}</span>
                          {assignee.email && <span className="assignee-email">{assignee.email}</span>}
                        </div>
                        <button
                          type="button"
                          className="assignee-clear"
                          onClick={() => {
                            setAssignee(null)
                            setAssigneeSearch('')
                          }}
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-row">
                  <label>Difficulty*</label>
                  <div className="difficulty-group">
                    <div className="difficulty-radio high">
                      <input id="create-diff-high" type="radio" name="create-difficulty" checked={selectedDifficulty==='High'} onChange={()=>{ setSelectedDifficulty('High'); setErrors(prev=>({...prev, difficulty:undefined})) }} />
                      <label htmlFor="create-diff-high"><span className="dot"/>High</label>
                    </div>
                    <div className="difficulty-radio medium">
                      <input id="create-diff-medium" type="radio" name="create-difficulty" checked={selectedDifficulty==='Medium'} onChange={()=>{ setSelectedDifficulty('Medium'); setErrors(prev=>({...prev, difficulty:undefined})) }} />
                      <label htmlFor="create-diff-medium"><span className="dot"/>Medium</label>
                    </div>
                    <div className="difficulty-radio low">
                      <input id="create-diff-low" type="radio" name="create-difficulty" checked={selectedDifficulty==='Low'} onChange={()=>{ setSelectedDifficulty('Low'); setErrors(prev=>({...prev, difficulty:undefined})) }} />
                      <label htmlFor="create-diff-low"><span className="dot"/>Low</label>
                    </div>
                  </div>
                  {errors.difficulty && <div className="error-text">{errors.difficulty}</div>}
                </div>

                <div className="form-row">
                  <label className="description-label">
                    Description* <span className={`issue-type-badge ${(issueType || '').toLowerCase()}`}>{issueType}</span>
                  </label>
                  <div className="toolbar format-toolbar">
                    <button
                      type="button"
                      className={`format-btn ${formatState.bold ? 'active' : ''}`}
                      onMouseDown={e=>e.preventDefault()}
                      onClick={() => { document.execCommand('bold'); updateFormatState() }}
                      aria-label="Bold"
                      aria-pressed={formatState.bold}
                    >
                      <strong>B</strong>
                    </button>
                    <button
                      type="button"
                      className={`format-btn ${formatState.italic ? 'active' : ''}`}
                      onMouseDown={e=>e.preventDefault()}
                      onClick={() => { document.execCommand('italic'); updateFormatState() }}
                      aria-label="Italic"
                      aria-pressed={formatState.italic}
                    >
                      <em>I</em>
                    </button>
                    <button
                      type="button"
                      className={`format-btn ${formatState.underline ? 'active' : ''}`}
                      onMouseDown={e=>e.preventDefault()}
                      onClick={() => { document.execCommand('underline'); updateFormatState() }}
                      aria-label="Underline"
                      aria-pressed={formatState.underline}
                    >
                      <u>U</u>
                    </button>

                    <div className="align-group">
                      <button
                        type="button"
                        className={`format-btn align-btn ${formatState.align === 'left' ? 'active' : ''}`}
                        onMouseDown={e=>e.preventDefault()}
                        onClick={() => { document.execCommand('justifyLeft'); updateFormatState() }}
                        title="Align left"
                        aria-label="Align left"
                        aria-pressed={formatState.align === 'left'}
                      >
                        <FiAlignLeft />
                      </button>
                      <button
                        type="button"
                        className={`format-btn align-btn ${formatState.align === 'center' ? 'active' : ''}`}
                        onMouseDown={e=>e.preventDefault()}
                        onClick={() => { document.execCommand('justifyCenter'); updateFormatState() }}
                        title="Center"
                        aria-label="Center"
                        aria-pressed={formatState.align === 'center'}
                      >
                        <FiAlignCenter />
                      </button>
                      <button
                        type="button"
                        className={`format-btn align-btn ${formatState.align === 'right' ? 'active' : ''}`}
                        onMouseDown={e=>e.preventDefault()}
                        onClick={() => { document.execCommand('justifyRight'); updateFormatState() }}
                        title="Align right"
                        aria-label="Align right"
                        aria-pressed={formatState.align === 'right'}
                      >
                        <FiAlignRight />
                      </button>
                      <button
                        type="button"
                        className={`format-btn align-btn ${formatState.align === 'justify' ? 'active' : ''}`}
                        onMouseDown={e=>e.preventDefault()}
                        onClick={() => { document.execCommand('justifyFull'); updateFormatState() }}
                        title="Justify"
                        aria-label="Justify"
                        aria-pressed={formatState.align === 'justify'}
                      >
                        <FiAlignJustify />
                      </button>
                    </div>

                    <input type="color" className="color-input" defaultValue="#10b981" onMouseDown={e=>e.preventDefault()} onChange={(e)=>{ document.execCommand('foreColor', false, e.target.value); updateFormatState() }} title="Text color" />
                    <button type="button" className="format-btn upload-btn" onMouseDown={e=>e.preventDefault()} onClick={()=>fileInputRef.current?.click()} title={uploadingAttachments ? 'Uploading...' : 'Attach files'} disabled={uploadingAttachments}>
                      <FiUpload />
                    </button>
                    <input type="file" ref={fileInputRef} style={{display:'none'}} accept=".pdf,image/*,.doc,.docx" multiple onChange={(e)=>{ handleAddFiles(e.target.files) }} />
                  </div>
                    <div
                      className={`form-control description-area ${errors.description ? 'invalid' : ''}`}
                      contentEditable={true}
                      suppressContentEditableWarning={true}
                      ref={descRef}
                      onInput={()=>{ setErrors(prev=>({...prev, description:undefined})); updateFormatState() }}
                      onFocus={updateFormatState}
                      onKeyDown={preventLeadingSpaceInDescription}
                    />
                  {errors.description && <div className="error-text">{errors.description}</div>}

                  {attachments.length > 0 && (
                    <div className="attachments">
                      {attachments.map((f, i) => (
                        <div className="attachment-item" key={i} title={f.name}>
                              {(f.url || f.data) ? (
                                <button type="button" className="attachment-name link-like" onClick={(e)=>{ e.preventDefault(); openIssueAttachment(f) }}>{f.name}</button>
                              ) : (
                                <span className="attachment-name">{f.name}</span>
                              )}
                          <button type="button" className="remove-attachment" onMouseDown={e=>e.preventDefault()} onClick={()=>handleRemoveAttachment(i)} title="Remove">
                            <FiX />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="form-row form-actions d-flex align-items-center">
                  <div className="flex-fill" />
                  <div className="action-right d-flex align-items-center gap-3">
                    {/* <label className="create-another">
                      <input type="checkbox" />
                      <span className="ms-2">Create another</span>
                    </label> */}

                    <button
                      type="button"
                      className="btn cancel-btn cancel-btn-danger"
                      onClick={closeCreateModal}
                    >
                      Cancel
                    </button>

                    <button type="button" className="btn btn-primary create-btn" onClick={handleCreate} disabled={uploadingAttachments || Object.values(errors).some(v => v)}>Create</button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        <section className="saved-filters-wrapper" style={{borderRadius:'10px'}}>
          <div className="saved-card">
            <div className="saved-filters-header">
              <div className="save-icon"><FiBookmark size={18} /></div>
              <div className="saved-filters-text">
                <h5>Saved Filters</h5>
                <p className="muted">Quickly apply your saved filter presets</p>
              </div>
            </div>

            <div className="saved-inner-grid">
              <div className="inner-filter-card">
                <div className="inner-content" onClick={() => navigate('/all-my-issues?difficulty=High')} role="link" tabIndex={0} onKeyDown={(e)=>{ if(e.key==='Enter') navigate('/all-my-issues?difficulty=High') }}>
                  <div>
                    <h6>High Priority Tasks</h6>
                    <p className="filter-desc">All high and highest priority tasks</p>
                  </div>

                  <div className="filter-actions-row">
                    <button className="apply-btn" onClick={() => navigate('/all-my-issues?difficulty=High')}><FiFilter className="me-2" />Apply</button>
                    <div className="icons-row">
                      <button className="icon-btn" title="Share"><FiShare2 /></button>
                      <button className="icon-btn" title="Download"><FiDownload /></button>
                      <button className="icon-btn danger" title="Delete"><FiTrash2 /></button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="inner-filter-card">
                <div className="inner-content" onClick={() => navigate('/all-my-issues')} role="link" tabIndex={0} onKeyDown={(e)=>{ if(e.key==='Enter') navigate('/all-my-issues') }}>
                  <div>
                    <h6>My Open Issues <span className="shared-badge">Shared</span></h6>
                    <p className="filter-desc">Issues assigned to me that are not completed</p>
                  </div>

                  <div className="filter-actions-row">
                    <button className="apply-btn"><FiFilter className="me-2" />Apply</button>
                    <div className="icons-row">
                      <button className="icon-btn" title="Share"><FiShare2 /></button>
                      <button className="icon-btn" title="Download"><FiDownload /></button>
                      <button className="icon-btn danger" title="Delete"><FiTrash2 /></button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        

        <section className="dashboard-cards mt-4">
          <div
            className="stat-card sprint-card"
            role="button"
            tabIndex={0}
            aria-label="Open active sprint backlog"
            onClick={openActiveSprint}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                openActiveSprint()
              }
            }}
          >
            <div className="stat-card-body">
              <div className="stat-meta">
                <div className="muted">Active Sprint</div>
                <h3 className="stat-title">{activeSprint?.name || 'No active sprint yet'}</h3>
              </div>

              <div className="stat-progress">
                <div className="progress-row">
                  <div className="progress-label">Progress</div>
                  <div className="progress-count">{sprintProgress.done}/{sprintProgress.total}</div>
                </div>
                <div className="progress-track"><div className="progress-fill" style={{width: `${sprintProgress.pct}%`}}></div></div>
                <div className="time-remaining"><FiClock className="me-2" />{sprintTimeLabel}</div>
              </div>
            </div>
          </div>

          <div className="stat-card total-issues-card">
            <div className="stat-card-body">
              <div className="muted">Total Issues</div>
              <h3 className="stat-title">{totalIssues}</h3>

              <div className="issues-legend">
                <div className="legend-row clickable legend-high" onClick={() => navigate('/all-my-issues?difficulty=High')} role="button" tabIndex={0} onKeyDown={(e)=>{ if(e.key==='Enter') navigate('/all-my-issues?difficulty=High') }}>
                  <span className="dot dot-red"/> High <span className="legend-count">{difficultyCounts.High}</span>
                </div>
                <div className="legend-row clickable legend-medium" onClick={() => navigate('/all-my-issues?difficulty=Medium')} role="button" tabIndex={0} onKeyDown={(e)=>{ if(e.key==='Enter') navigate('/all-my-issues?difficulty=Medium') }}>
                  <span className="dot dot-yellow"/> Medium <span className="legend-count">{difficultyCounts.Medium}</span>
                </div>
                <div className="legend-row clickable legend-low" onClick={() => navigate('/all-my-issues?difficulty=Low')} role="button" tabIndex={0} onKeyDown={(e)=>{ if(e.key==='Enter') navigate('/all-my-issues?difficulty=Low') }}>
                  <span className="dot dot-green"/> Low <span className="legend-count">{difficultyCounts.Low}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        <section className="dashboard-cards-2 mt-4">
          <div className="task-card">
            <div className="task-card-body">
              <div className="muted">My Tasks</div>
              <h3 className="task-count">{taskCounts.progress + taskCounts.review + taskCounts.todo + taskCounts.done}</h3>

              <div className="task-list">
                <div
                  className="task-row"
                  role="button"
                  tabIndex={0}
                  onClick={() => openBoardByStatus('progress')}
                  onKeyDown={(e) => { if (e.key === 'Enter') openBoardByStatus('progress') }}
                >
                  <span>In Progress</span>
                  <span className="task-num">{taskCounts.progress}</span>
                </div>
                <div
                  className="task-row"
                  role="button"
                  tabIndex={0}
                  onClick={() => openBoardByStatus('review')}
                  onKeyDown={(e) => { if (e.key === 'Enter') openBoardByStatus('review') }}
                >
                  <span>In Review</span>
                  <span className="task-num">{taskCounts.review}</span>
                </div>
                <div
                  className="task-row"
                  role="button"
                  tabIndex={0}
                  onClick={() => openBoardByStatus('todo')}
                  onKeyDown={(e) => { if (e.key === 'Enter') openBoardByStatus('todo') }}
                >
                  <span>To Do</span>
                  <span className="task-num">{taskCounts.todo}</span>
                </div>
                <div
                  className="task-row"
                  role="button"
                  tabIndex={0}
                  onClick={() => openBoardByStatus('done')}
                  onKeyDown={(e) => { if (e.key === 'Enter') openBoardByStatus('done') }}
                >
                  <span>Done</span>
                  <span className="task-num">{taskCounts.done}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="overdue-card">
            <div className="overdue-card-body">
              <div className="muted overdue-title">Overdue Tasks</div>
              <h3 className="overdue-count">{overdueTasks.length}</h3>

              {overdueTasks.length === 0 ? (
                <div className="muted">No overdue tasks</div>
              ) : (
                <ul className="overdue-list">
                  {overdueTasks.map((task, index) => (
                    <li
                      key={`${task.projectKey || 'project'}:${task.id}:${index}`}
                      className="overdue-item"
                      role="button"
                      tabIndex={0}
                      onClick={() => openIssueFromActivity(task.id, task.projectKey)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          openIssueFromActivity(task.id, task.projectKey)
                        }
                      }}
                    >
                      <span className="overdue-icon">!</span>
                      <span className="overdue-text">{task.title}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        <section className="recent-activity mt-4">
          <div className="recent-card">
            <div className="recent-header">
              <h5>Recent Activity</h5>
              <p className="muted">Latest updates across all projects</p>
            </div>

            <div className="activity-list">
              {recentActivities.length === 0 ? (
                <div className="muted">No recent activity</div>
              ) : (
                recentActivities.map((item, index) => (
                  <div
                    key={`${item.projectKey || 'project'}:${item.key}:${index}`}
                    className={`activity-item ${index === 2 ? 'highlight' : ''}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => openIssueFromActivity(item.key, item.projectKey)}
                    onKeyDown={(e) => { if (e.key === 'Enter') openIssueFromActivity(item.key, item.projectKey) }}
                  >
                    <div className="activity-icon-square">
                      <div className={`activity-dot ${item.dotColor}`} />
                    </div>

                    <div className="activity-body">
                      <div className="activity-meta">
                        <span className="activity-key">{item.key}</span>
                        <span className="activity-type">{item.type}</span>
                      </div>
                      <div className="activity-title">{item.title}</div>
                      <div className="activity-sub muted">
                        <span className="activity-sub-item">
                          <FiTag className="activity-sub-icon" />
                          {item.statusLabel}
                        </span>
                        <span className="activity-sub-item">
                          <FiGrid className="activity-sub-icon" />
                          Board data
                        </span>
                        <span className="activity-user">
                          <div className="small-avatar">{getInitials(item.assignee)}</div> {item.assignee}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="active-projects mt-4">
          <div className="active-projects-card">
            <div className="active-projects-header d-flex align-items-start">
              <div>
                <h5>Active Projects</h5>
                <p className="muted">Quick overview of your projects</p>
              </div>
              <div className="ms-auto">
                <button className="view-all-btn" onClick={() => navigate('/projects')}>View All <span className="arrow">&rarr;</span></button>
              </div>
            </div>

            <div className="projects-grid mt-3">
              {activeProjects.map((project) => (
                <div
                  key={project.id}
                  className="project-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => openProjectBoard(project)}
                  onKeyDown={(e) => { if (e.key === 'Enter') openProjectBoard(project) }}
                >
                  <div className="project-card-body">
                    <div className="project-top d-flex align-items-center gap-3">
                      <div className="project-icon">{project.icon}</div>
                      <div>
                        <div className="project-title">{project.name}</div>
                        <div className="project-code muted">{project.code}</div>
                      </div>
                    </div>

                    <div className="project-progress-row mt-3 d-flex align-items-center">
                      <div className="muted">Progress</div>
                      <div className="progress-count ms-auto">{project.progressCount}</div>
                    </div>
                    <div className="progress-track mt-2"><div className="progress-fill" style={{width: `${project.progressPct}%`}}></div></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
          </>
        )}
      </main>

      {showManagerTeamsModal && (
        <div className="manager-teams-modal" role="dialog" aria-modal="true" aria-label="Project manager teams" onClick={closeManagerTeamsModal}>
          <section className="manager-teams-panel" onClick={(event) => event.stopPropagation()}>
            <div className="manager-teams-header">
              <div>
                <p className="muted mb-1">Teams</p>
                <h4 className="manager-teams-title">Project managers and their teams</h4>
                <p className="muted">See each manager, their projects, and current members.</p>
              </div>
              <button className="btn btn-link manager-teams-close" type="button" onClick={closeManagerTeamsModal} aria-label="Close">
                <FiX size={20} />
              </button>
            </div>
            {managerTeamsLoading && (
              <div className="manager-teams-loading">Loading teams…</div>
            )}
            {!managerTeamsLoading && managerTeamsError && (
              <div className="manager-teams-error text-danger">{managerTeamsError}</div>
            )}
            {!managerTeamsLoading && !managerTeamsError && managerTeams.length === 0 && (
              <div className="manager-teams-empty">No manager teams found.</div>
            )}
            {!managerTeamsLoading && managerTeams.length > 0 && (
              <div className="manager-teams-grid">
                {managerTeams.map((manager) => {
                  const managerKey = manager.managerEmail || manager.managerName || Math.random().toString()
                  return (
                    <article key={`manager-${managerKey}`} className="manager-card">
                      <div className="manager-card-head">
                        <h5 className="manager-card-name">{manager.managerName || manager.managerEmail || 'Manager'}</h5>
                        <p className="manager-card-email">{manager.managerEmail}</p>
                      </div>
                      {manager.projects && manager.projects.length > 0 ? (
                        <div className="manager-projects">
                          {manager.projects.map((project) => {
                            const projectKey = project.projectId || project.projectKey || project.projectName || Math.random().toString()
                            return (
                              <details key={`project-${projectKey}`} className="manager-project">
                                <summary>
                                  <span className="manager-project-title">
                                    {project.projectName || project.projectKey || 'Project'}
                                  </span>
                                </summary>
                                <div className="manager-project-members">
                                  {project.members && project.members.length ? (
                                    project.members.map((member, index) => (
                                      <div className="manager-project-member" key={`${projectKey}-${member.email || index}`}>
                                        <span className="member-name">{member.name || member.email}</span>
                                        <span className="member-role-badge">{member.role || 'Member'}</span>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="manager-project-empty">No members yet.</div>
                                  )}
                                </div>
                              </details>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="manager-no-projects muted">No projects assigned yet.</p>
                      )}
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}


