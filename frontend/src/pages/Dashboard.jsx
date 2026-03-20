import { useNavigate, useLocation } from 'react-router-dom'
import './Dashboard.css'
import { FiGrid, FiFolder, FiUsers, FiBarChart2, FiCreditCard, FiSettings, FiLogOut, FiMenu, FiSearch, FiBell, FiPlus, FiShare2, FiDownload, FiTrash2, FiFilter, FiTag, FiBookmark, FiClock, FiRepeat, FiArrowRight, FiUpload, FiAlignLeft, FiAlignCenter, FiAlignRight, FiAlignJustify } from 'react-icons/fi'
import { NavLink } from 'react-router-dom'
import { useState, useRef, useEffect, useMemo } from 'react'
import { FiX } from 'react-icons/fi'
import { BOARD_COLUMNS } from '../data/boardColumns'
import { useAuth } from '../context/AuthContext'
import useIssueNotifications from '../hooks/useIssueNotifications'
import { uploadFiles } from '../utils/upload'
import { getInitials } from '../utils/initials'

function formatDateForInput(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function normalizeRole(role) {
  return (role || '').trim().toLowerCase()
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

function getDefaultDueDateRange(daysBack = 30) {
  const today = new Date()
  const to = formatDateForInput(today)
  const fromDate = new Date(today)
  fromDate.setDate(fromDate.getDate() - daysBack)
  const from = formatDateForInput(fromDate)
  return { from, to }
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
  const location = useLocation()
  const { user, clearUser } = useAuth()
  const displayName = user?.name || (user?.email ? user.email.split('@')[0] : 'Guest')
  const avatarInitials = getInitials(user?.name || displayName, user?.email)
  const userEmail = (user?.email || '').trim().toLowerCase()
  const isProjectManager = ['admin', 'project manager'].includes(normalizeRole(user?.role))
  const isDeveloper = normalizeRole(user?.role) === 'developer'
  const showSelectedOrgName = true
  const [selectedOrg, setSelectedOrg] = useState(() => {
    try { return typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('org') || 'null') : null } catch (e) { return null }
  })
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [showCreate, setShowCreate] = useState(initialShowCreate)
  const [showNotifications, setShowNotifications] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [topSearchText, setTopSearchText] = useState('')
  const [dashboardSearchText, setDashboardSearchText] = useState('')
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
  const projectLabel = (projectItem) => {
    const key = projectKeyFrom(projectItem)
    const name = projectItem?.name || key || 'Project'
    return key ? `${name} (${key})` : name
  }

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
      catch (err) {}
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
      if (isProjectManager) {
        queryParams.set('managerEmail', email)
      } else {
        queryParams.set('memberEmail', email)
      }
    }
    const organizationId = selectedOrg?.id || selectedOrg?._id || ''
    const organizationUsername = selectedOrg?.username || selectedOrg?.slug || ''
    const organizationName = selectedOrg?.name || ''
    if (organizationId) queryParams.set('organizationId', organizationId)
    if (organizationUsername) queryParams.set('organizationUsername', organizationUsername)
    if (organizationName) queryParams.set('organizationName', organizationName)
    const query = queryParams.toString()

    fetch(`${API_BASE}/api/projects${query ? `?${query}` : ''}`, { signal: controller.signal })
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
  }, [API_BASE, isProjectManager, selectedOrg?.id, selectedOrg?._id, selectedOrg?.name, selectedOrg?.slug, selectedOrg?.username, user?.email])

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
    if (!showFilters) return
    const { from, to } = getDefaultDueDateRange(30)
    setSelectedFilters((prev) => {
      const dueFrom = prev.dueFrom || from
      return {
        ...prev,
        dueFrom: dueFrom > to ? from : dueFrom,
        dueTo: to
      }
    })
  }, [showFilters])

  useEffect(() => {
    if (!mobileSearchOpen) return
    const timeoutId = setTimeout(() => topSearchInputRef.current?.focus(), 0)
    return () => clearTimeout(timeoutId)
  }, [mobileSearchOpen])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('dashboardSavedFilters')
      const parsed = raw ? JSON.parse(raw) : []
      if (Array.isArray(parsed)) setSavedFilters(parsed)
    } catch (err) {
      console.error('failed to load saved filters', err)
    }
  }, [])

  function toggleNotifications() {
    setShowNotifications(prev => !prev)
  }

  function markAsRead(id) {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)))
  }

  function markAllAsRead() {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
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
  function resolveAttachmentUrl(file) {
    const raw = file?.url || file?.fileUrl || file?.downloadUrl || file?.link || file?.href || file?.data || ''
    if (!raw) return ''
    if (file?.data && !/^(https?:|blob:|data:|\/\/)/i.test(raw)) {
      const mime = file?.type || 'application/octet-stream'
      return `data:${mime};base64,${raw}`
    }

    let url = raw
    const name = (file?.name || '').toLowerCase()
    const format = (file?.format || '').toLowerCase()
    const type = (file?.type || '').toLowerCase()
    const resourceType = (file?.resourceType || '').toLowerCase()
    const extFromName = (name.match(/\.([a-z0-9]+)$/) || [])[1] || ''
    const extFromUrl = (() => {
      try {
        const clean = url.split('?')[0].split('#')[0]
        const match = clean.match(/\.([a-z0-9]+)$/i)
        return match ? match[1].toLowerCase() : ''
      } catch (e) { return '' }
    })()
    const ext = extFromName || format || extFromUrl

    const isImage = type.startsWith('image/') || ['png','jpg','jpeg','gif','webp','bmp','svg','heic','heif'].includes(ext)
    const isVideoAudio = type.startsWith('video/') || type.startsWith('audio/') || ['mp4','webm','mov','avi','mkv','mp3','wav','m4a','ogg','flac'].includes(ext)

    if (typeof url === 'string') {
      if (resourceType === 'raw' && url.includes('/image/upload/')) {
        url = url.replace('/image/upload/', '/raw/upload/')
      } else if (resourceType === 'video' && url.includes('/image/upload/')) {
        url = url.replace('/image/upload/', '/video/upload/')
      } else if (!resourceType && url.includes('/image/upload/') && !isImage) {
        url = url.replace('/image/upload/', isVideoAudio ? '/video/upload/' : '/raw/upload/')
      }
    }
    return url
  }
  function inferMimeType(file, url = '') {
    const type = (file?.type || '').toLowerCase()
    if (type && type !== 'application/octet-stream') return type
    const name = (file?.name || '').toLowerCase()
    const fromName = (name.match(/\.([a-z0-9]+)$/) || [])[1] || ''
    const fromUrl = (() => {
      try {
        const clean = url.split('?')[0].split('#')[0]
        const match = clean.match(/\.([a-z0-9]+)$/i)
        return match ? match[1].toLowerCase() : ''
      } catch (e) { return '' }
    })()
    const ext = fromName || fromUrl || (file?.format || '').toLowerCase()
    if (!ext) return ''
    const map = {
      pdf: 'application/pdf',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      webp: 'image/webp',
      bmp: 'image/bmp',
      svg: 'image/svg+xml',
      heic: 'image/heic',
      heif: 'image/heif',
      mp4: 'video/mp4',
      webm: 'video/webm',
      mov: 'video/quicktime',
      avi: 'video/x-msvideo',
      mkv: 'video/x-matroska',
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      m4a: 'audio/mp4',
      ogg: 'audio/ogg',
      flac: 'audio/flac',
      txt: 'text/plain',
      csv: 'text/csv',
      json: 'application/json',
      xml: 'application/xml',
      md: 'text/markdown',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      zip: 'application/zip',
      rar: 'application/vnd.rar',
      '7z': 'application/x-7z-compressed'
    }
    return map[ext] || ''
  }

  function isViewableMime(mime) {
    if (!mime) return false
    return (
      mime.startsWith('image/') ||
      mime.startsWith('video/') ||
      mime.startsWith('audio/') ||
      mime.startsWith('text/') ||
      mime === 'application/pdf' ||
      mime === 'application/json' ||
      mime === 'application/xml'
    )
  }

  async function downloadAttachment(file){
    const href = resolveAttachmentUrl(file)
    if (!href) return
    const fileName = file?.name || file?.originalFilename || 'attachment'
    try{
      const res = await fetch(href)
      if(!res.ok) throw new Error('download failed')
      const blob = await res.blob()
      const inferredType = inferMimeType(file, href)
      const typedBlob = inferredType && inferredType !== blob.type
        ? blob.slice(0, blob.size, inferredType)
        : blob
      const blobUrl = URL.createObjectURL(typedBlob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      a.remove()

      if (isViewableMime(typedBlob.type)) {
        const opened = window.open(blobUrl, '_blank', 'noopener,noreferrer')
        if (!opened) {
          // fallback: navigate in same tab if popup blocked
          window.location.href = blobUrl
        }
      }
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000)
    }catch(err){
      console.error('download failed', err)
      const opened = window.open(href, '_blank', 'noopener,noreferrer')
      if (opened) return
      const a = document.createElement('a')
      a.href = href
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      a.remove()
    }
  }
  function handleRemoveAttachment(idx){
    setAttachments(prev => prev.filter((_, i) => i !== idx))
  }
  
  function validateForm(){
    const desc = descRef.current ? descRef.current.innerText.trim() : ''
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
  const [formatState, setFormatState] = useState({ bold: false, italic: false, underline: false })

  function updateFormatState() {
    if (typeof document === 'undefined') return
    const editor = descRef.current
    if (!editor) return
    const selection = document.getSelection()
    if (!selection || selection.rangeCount === 0) return
    const anchor = selection.anchorNode
    const focus = selection.focusNode
    if (editor.contains(anchor) || editor.contains(focus)) {
      setFormatState({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline')
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
  const activeSprint = {
    name: 'Sprint 2 - Board Implementation',
    start: '2026-03-01',
    end: '2026-03-14'
  }
  const matchesSelectedOrg = (projectItem) => {
    if (!selectedOrg) return true
    const orgId = (selectedOrg?.id || selectedOrg?._id || '').toString().trim()
    const orgUsername = (selectedOrg?.username || selectedOrg?.slug || '').toString().trim().toLowerCase()
    const orgName = (selectedOrg?.name || '').toString().trim().toLowerCase()
    if (!orgId && !orgUsername && !orgName) return true
    const projectOrgId = (projectItem?.organizationId || '').toString().trim()
    const projectOrgUsername = (projectItem?.organizationUsername || '').toString().trim().toLowerCase()
    const projectOrgName = (projectItem?.organizationName || '').toString().trim().toLowerCase()
    return (
      (orgId && projectOrgId && projectOrgId === orgId) ||
      (orgUsername && projectOrgUsername && projectOrgUsername === orgUsername) ||
      (orgName && projectOrgName && projectOrgName === orgName)
    )
  }
  const activeProjects = useMemo(() => (
    (projects || [])
      .filter((projectItem) => !projectItem?.isArchived)
      .filter((projectItem) => matchesSelectedOrg(projectItem))
      .map((projectItem) => {
      const key = projectKeyFrom(projectItem)
      const total = Number(projectItem?.totalIssues || 0)
      const completed = Number(projectItem?.completedIssues || 0)
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
  ), [projects, selectedOrg])
  const projectRecencyTime = (projectItem) => {
    const date = parseBackendDate(projectItem?.updatedAt || projectItem?.createdAt || projectItem?.createdOn)
    return date ? date.getTime() : 0
  }
  const recentActiveProjects = useMemo(() => {
    const sorted = [...activeProjects].sort((a, b) => projectRecencyTime(b) - projectRecencyTime(a))
    return sorted.slice(0, 3)
  }, [activeProjects])
  const sprintProgress = useMemo(() => {
    let total = 0
    let done = 0
    BOARD_COLUMNS.forEach((column) => {
      const count = Array.isArray(column.issues) ? column.issues.length : 0
      total += count
      if (column.key === 'done') done += count
    })
    const pct = total ? Math.round((done / total) * 100) : 0
    return { total, done, pct }
  }, [])
  const sprintTimeLabel = useMemo(() => {
    if (!activeSprint?.start || !activeSprint?.end) return 'Dates not set'
    const start = new Date(activeSprint.start)
    const end = new Date(activeSprint.end)
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
  }, [activeSprint.start, activeSprint.end])
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
          return
        }
        const res = await fetch(`${API_BASE}/api/issues`, { headers: { 'X-USER-ID': String(user.id) } })
        if(!res.ok) throw new Error('failed to fetch')
        const data = await res.json()
        const parsed = Array.isArray(data) ? data.map(d => ({ ...d })) : []
        const scoped = isProjectManager || !userEmail
          ? parsed
          : parsed.filter((it) => {
            const assigneeEmail = (it.assigneeEmail || it.assignee || it.creatorEmail || '').toString().toLowerCase()
            return assigneeEmail && assigneeEmail === userEmail
          })
        setTotalIssues(scoped.length)
        const counts = { High:0, Medium:0, Low:0 }
        scoped.forEach(it => {
          const diff = (it.difficulty || '').toString()
          if(diff.toLowerCase()==='high') counts.High++
          else if(diff.toLowerCase()==='medium') counts.Medium++
          else if(diff.toLowerCase()==='low') counts.Low++
        })
        setDifficultyCounts(counts)

        const nextTaskCounts = { todo: 0, progress: 0, review: 0, done: 0 }
        const today = formatDateForInput(new Date())
        const nextOverdue = []
        scoped.forEach((it) => {
          const status = normalizeStatus(it.status)
          if (status === 'todo') nextTaskCounts.todo += 1
          else if (status === 'progress') nextTaskCounts.progress += 1
          else if (status === 'review') nextTaskCounts.review += 1
          else if (status === 'done') nextTaskCounts.done += 1

          const deadline = (it.deadlineDate || '').toString().trim()
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

        const nextActivities = scoped
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
  },[API_BASE, isProjectManager, userEmail, user?.id])

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
    const projectItem = activeProjects[0]
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

  function getInitials(name) {
    return (name || '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('')
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
    if (filters.dueFrom || filters.dueTo) parts.push('due date range')
    return parts.length ? parts.join(', ') : 'No filters selected'
  }

  function saveCurrentFilter() {
    if (activeFilterCount === 0) return
    const newFilter = {
      id: Date.now(),
      name: `Custom Filter ${savedFilters.length + 1}`,
      description: getFilterSummary(selectedFilters),
      criteria: { ...selectedFilters }
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

  function applySavedFilter(criteria) {
    setSelectedFilters({
      status: [...criteria.status],
      issueType: [...criteria.issueType],
      sprint: [...criteria.sprint],
      priority: [...criteria.priority],
      assignee: [...criteria.assignee],
      project: [...criteria.project],
      dueFrom: criteria.dueFrom || '',
      dueTo: criteria.dueTo || ''
    })
  }

  function deleteSavedFilter(id) {
    const updated = savedFilters.filter((item) => item.id !== id)
    setSavedFilters(updated)
    try {
      localStorage.setItem('dashboardSavedFilters', JSON.stringify(updated))
    } catch (err) {
      console.error('failed to delete saved filter', err)
    }
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
          {showSelectedOrgName && (
            <div className="org-header">
              <div className="org-icon">{selectedOrg?.name ? selectedOrg.name.charAt(0) : 'K'}</div>
              <div className="org-name-only">{selectedOrg?.name || 'Organization'}</div>
            </div>
          )}
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
              Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </button>
          </div>
        </header>

        {showFilters && (
          <div className="filters-modal-overlay" onClick={() => setShowFilters(false)}>
            <div className="filters-modal" role="dialog" aria-modal="true" onClick={(e)=>e.stopPropagation()}>
              <div className="filters-modal-header d-flex align-items-start">
                <div>
                  <h5><FiFilter className="me-2" /> Advanced Filters</h5>
                  <p className="muted">Refine your search with multiple criteria</p>
                </div>
                <button className="btn modal-close" onClick={() => setShowFilters(false)} aria-label="Close"><FiX size={18} /></button>
              </div>

              <div className="filters-body">
                <div className="filters-grid">
                  <div className="filters-column">
                    <div className="filter-section">
                      <h6>Status</h6>
                      <div className="filter-list">
                        <label><input type="checkbox" checked={selectedFilters.status.includes('To Do')} onChange={() => toggleFilterSelection('status', 'To Do')} /> To Do</label>
                        <label><input type="checkbox" checked={selectedFilters.status.includes('In Progress')} onChange={() => toggleFilterSelection('status', 'In Progress')} /> In Progress</label>
                        <label><input type="checkbox" checked={selectedFilters.status.includes('In Review')} onChange={() => toggleFilterSelection('status', 'In Review')} /> In Review</label>
                        <label><input type="checkbox" checked={selectedFilters.status.includes('Done')} onChange={() => toggleFilterSelection('status', 'Done')} /> Done</label>
                        <label><input type="checkbox" checked={selectedFilters.status.includes('Backlog')} onChange={() => toggleFilterSelection('status', 'Backlog')} /> Backlog</label>
                      </div>
                    </div>

                    <div className="filter-section">
                      <h6>Issue Type</h6>
                      <div className="filter-list">
                        <label><input type="checkbox" checked={selectedFilters.issueType.includes('Epic')} onChange={() => toggleFilterSelection('issueType', 'Epic')} /> Epic</label>
                        <label><input type="checkbox" checked={selectedFilters.issueType.includes('Story')} onChange={() => toggleFilterSelection('issueType', 'Story')} /> Story</label>
                        <label><input type="checkbox" checked={selectedFilters.issueType.includes('Task')} onChange={() => toggleFilterSelection('issueType', 'Task')} /> Task</label>
                        <label><input type="checkbox" checked={selectedFilters.issueType.includes('Bug')} onChange={() => toggleFilterSelection('issueType', 'Bug')} /> Bug</label>
                        <label><input type="checkbox" checked={selectedFilters.issueType.includes('Sub-task')} onChange={() => toggleFilterSelection('issueType', 'Sub-task')} /> Sub-task</label>
                      </div>
                    </div>

                    <div className="filter-section">
                      <h6>Sprint</h6>
                      <div className="filter-list">
                        <label><input type="checkbox" checked={selectedFilters.sprint.includes('Sprint 1 - Foundation')} onChange={() => toggleFilterSelection('sprint', 'Sprint 1 - Foundation')} /> Sprint 1 - Foundation <span className="muted">(completed)</span></label>
                        <label><input type="checkbox" checked={selectedFilters.sprint.includes('Sprint 2 - Board Implementation')} onChange={() => toggleFilterSelection('sprint', 'Sprint 2 - Board Implementation')} /> Sprint 2 - Board Implementation <span className="muted">(active)</span></label>
                        <label><input type="checkbox" checked={selectedFilters.sprint.includes('Sprint 3 - Advanced Features')} onChange={() => toggleFilterSelection('sprint', 'Sprint 3 - Advanced Features')} /> Sprint 3 - Advanced Features <span className="muted">(planned)</span></label>
                      </div>
                    </div>
                  </div>

                  <div className="filters-column">
                    <div className="filter-section">
                      <h6>Priority</h6>
                      <div className="filter-list priority-list">
                        <label><input type="checkbox" checked={selectedFilters.priority.includes('High')} onChange={() => toggleFilterSelection('priority', 'High')} /><span className="dot dot-red"/> High</label>
                        <label><input type="checkbox" checked={selectedFilters.priority.includes('Medium')} onChange={() => toggleFilterSelection('priority', 'Medium')} /><span className="dot dot-yellow"/> Medium</label>
                        <label><input type="checkbox" checked={selectedFilters.priority.includes('Low')} onChange={() => toggleFilterSelection('priority', 'Low')} /><span className="dot dot-green"/> Low</label>
                      </div>
                    </div>

                    <div className="filter-section">
                      <h6>Assignee</h6>
                      <div className="filter-list assignee-list">
                        <label><input type="checkbox" checked={selectedFilters.assignee.includes('Sarah Johnson')} onChange={() => toggleFilterSelection('assignee', 'Sarah Johnson')} /> <span className="small-avatar">SJ</span> Sarah Johnson</label>
                        <label><input type="checkbox" checked={selectedFilters.assignee.includes('Michael Chen')} onChange={() => toggleFilterSelection('assignee', 'Michael Chen')} /> <span className="small-avatar">MC</span> Michael Chen</label>
                        <label><input type="checkbox" checked={selectedFilters.assignee.includes('Emily Rodriguez')} onChange={() => toggleFilterSelection('assignee', 'Emily Rodriguez')} /> <span className="small-avatar">ER</span> Emily Rodriguez</label>
                        <label><input type="checkbox" checked={selectedFilters.assignee.includes('David Kim')} onChange={() => toggleFilterSelection('assignee', 'David Kim')} /> <span className="small-avatar">DK</span> David Kim</label>
                      </div>
                    </div>

                    <div className="filter-section">
                      <h6>Project</h6>
                      <div className="filter-list project-list">
                        {projectsLoading && <div className="muted">Loading projects...</div>}
                        {!projectsLoading && projects.length === 0 && (
                          <div className="muted">{projectsError || 'No projects found'}</div>
                        )}
                        {!projectsLoading && projects.map((projectItem) => {
                          const key = projectKeyFrom(projectItem)
                          if (!key) return null
                          return (
                            <label key={key}>
                              <input
                                type="checkbox"
                                checked={selectedFilters.project.includes(key)}
                                onChange={() => toggleFilterSelection('project', key)}
                              />
                              {projectLabel(projectItem)}
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="divider" />

                <div className="due-range-row d-flex gap-3">
                  <div className="due-col">
                    <div className="muted">Due Date Range</div>
                    <label className="small-muted">From</label>
                    <input
                      type="date"
                      className="date-input"
                      value={selectedFilters.dueFrom}
                      max={selectedFilters.dueTo || todayDateValue}
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
                      max={todayDateValue}
                      onChange={(e) => setSelectedFilters(prev => ({ ...prev, dueTo: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="filters-modal-footer d-flex align-items-center">
                <button className="link-clear" onClick={clearAllFilters} type="button">Clear All Filters</button>
                <div className="ms-auto d-flex gap-3">
                  <button className="btn btn-primary" onClick={applyFiltersToIssues} type="button">Apply</button>
                  <button className="btn btn-outline-secondary" onClick={() => setShowFilters(false)}>Close</button>
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
                              {projectLabel(projectItem)}
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
                  <label>Description*</label>
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
                      <button type="button" className="format-btn align-btn" onMouseDown={e=>e.preventDefault()} onClick={()=>document.execCommand('justifyLeft')} title="Align left"><FiAlignLeft /></button>
                      <button type="button" className="format-btn align-btn" onMouseDown={e=>e.preventDefault()} onClick={()=>document.execCommand('justifyCenter')} title="Center"><FiAlignCenter /></button>
                      <button type="button" className="format-btn align-btn" onMouseDown={e=>e.preventDefault()} onClick={()=>document.execCommand('justifyRight')} title="Align right"><FiAlignRight /></button>
                      <button type="button" className="format-btn align-btn" onMouseDown={e=>e.preventDefault()} onClick={()=>document.execCommand('justifyFull')} title="Justify"><FiAlignJustify /></button>
                    </div>

                    <input type="color" className="color-input" defaultValue="#10b981" onMouseDown={e=>e.preventDefault()} onChange={(e)=>document.execCommand('foreColor', false, e.target.value)} title="Text color" />
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
                                <button type="button" className="attachment-name link-like" onClick={(e)=>{ e.preventDefault(); downloadAttachment(f) }}>{f.name}</button>
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
                <h3 className="stat-title">{activeSprint.name}</h3>
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
                  {overdueTasks.map((task) => (
                    <li
                      key={`${task.projectKey || 'project'}:${task.id}`}
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
                    key={`${item.projectKey || 'project'}:${item.key}`}
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

        <section className="large-info-card mt-4">
          <div className="info-card">
            <h5>My Tasks</h5>
            <p className="muted">Issues assigned to you</p>
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
              {recentActiveProjects.map((project) => (
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
      </main>
    </div>
  )
}


