import { useEffect, useState, useRef } from 'react'
import { useNavigate, NavLink, useLocation } from 'react-router-dom'
import './Dashboard.css'
import { FiArrowLeft, FiArrowRight, FiGrid, FiFolder, FiUsers, FiBarChart2, FiCreditCard, FiSettings, FiLogOut, FiMenu, FiRepeat, FiEdit, FiTrash2, FiUpload, FiAlignLeft, FiAlignCenter, FiAlignRight, FiAlignJustify, FiX, FiSearch, FiBell, FiPlus } from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import useIssueNotifications from '../hooks/useIssueNotifications'
import { uploadFiles } from '../utils/upload'
import { getInitials } from '../utils/initials'

function stripHtml(value) {
  return (value || '').toString().replace(/<[^>]*>/g, ' ')
}

function normalizeRole(role) {
  return (role || '').trim().toLowerCase()
}

function parseCsvParam(params, key) {
  const raw = (params.get(key) || '').trim()
  if (!raw) return []
  return raw.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean)
}

function projectKeyFrom(projectItem) {
  return (projectItem?.projectKey || projectItem?.id || '').toString().trim()
}

function issueProjectKeyFrom(issueItem) {
  return (issueItem?.project || issueItem?.projectKey || issueItem?.projectId || '').toString().trim().toUpperCase()
}

function normalizeStatus(value) {
  const normalized = (value || '').toString().trim().toLowerCase()
  if (normalized === 'todo' || normalized === 'to-do' || normalized === 'to do') return 'todo'
  if (normalized === 'progress' || normalized === 'in-progress' || normalized === 'in progress') return 'progress'
  if (normalized === 'review' || normalized === 'in-review' || normalized === 'in review') return 'review'
  if (normalized === 'done' || normalized === 'completed') return 'done'
  return normalized
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
    const parsed = new Date(year, monthIndex, day, hour, minute, second, ms)
    return Number.isNaN(parsed.getTime()) ? null : parsed
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
      const parsed = new Date(year, monthValue - 1, day, hour, minute, second, ms)
      return Number.isNaN(parsed.getTime()) ? null : parsed
    }
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function formatDateForInput(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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

export default function AllMyIssues(){
  const API_BASE = (import.meta && import.meta.env && import.meta.env.VITE_API_BASE) || 'http://localhost:8080'
  const [issues, setIssues] = useState([])
  const navigate = useNavigate()
  const { user, clearUser } = useAuth()
  const displayName = user?.name || (user?.email ? user.email.split('@')[0] : 'Guest')
  const avatarInitials = getInitials(user?.name || displayName, user?.email)
  const userEmail = (user?.email || '').trim().toLowerCase()
  const normalizedUserName = (user?.name || displayName || '').trim().toLowerCase()
  const isAssignedToUser = (issue) => {
    if (!issue) return false
    const assigneeEmail = (issue.assigneeEmail || '').toString().toLowerCase()
    if (assigneeEmail && userEmail && assigneeEmail === userEmail) return true
    const assigneeName = (issue.assigneeName || issue.assignee || '').toString().trim().toLowerCase()
    if (assigneeName && normalizedUserName && assigneeName === normalizedUserName) return true
    return false
  }
  const isCreatedByUser = (issue) => {
    if (!issue) return false
    const creatorEmail = (issue.creatorEmail || '').toString().toLowerCase()
    if (creatorEmail && userEmail && creatorEmail === userEmail) return true
    const creatorName = (issue.creatorName || issue.creator || '').toString().trim().toLowerCase()
    if (creatorName && normalizedUserName && creatorName === normalizedUserName) return true
    return false
  }
  const isProjectManager = ['admin', 'project manager'].includes(normalizeRole(user?.role))
  const isDeveloper = normalizeRole(user?.role) === 'developer'
  const [selectedOrg, setSelectedOrg] = useState(() => { try { return typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('org') || 'null') : null } catch (e) { return null } })
  useEffect(() => {
    function onOrgChanged(e){ const org = e?.detail || null; setSelectedOrg(org); try { if (org) localStorage.setItem('org', JSON.stringify(org)) } catch(err){} }
    window.addEventListener('org:changed', onOrgChanged)
    return () => window.removeEventListener('org:changed', onOrgChanged)
  }, [])
  const [projects, setProjects] = useState([])
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [projectsError, setProjectsError] = useState('')
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
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [topSearchText, setTopSearchText] = useState('')
  const [showNotifications, setShowNotifications] = useState(false)
  const {
    notifications,
    unreadCount,
    loading: notificationsLoading,
    error: notificationsError,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    clearAllNotifications,
    refreshNotifications
  } = useIssueNotifications({ limit: 6 })
  const notificationRef = useRef(null)
  const topSearchInputRef = useRef(null)
  const [editingIndex, setEditingIndex] = useState(-1)
  const [editFields, setEditFields] = useState({ project:'', issueType:'Story', epicName:'', summary:'', description:'', attachments:[] })
  const [editErrors, setEditErrors] = useState({})
  const editFileInputRef = useRef(null)
  const editDescRef = useRef(null)
  const [uploadingEditAttachments, setUploadingEditAttachments] = useState(false)
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
  async function handleEditAddFiles(files){
    const arr = Array.from(files || [])
    if(arr.length === 0) return
    setUploadingEditAttachments(true)
    try{
      const uploaded = await uploadFiles(arr, { folder: 'issues' })
      const next = uploaded.map((u, idx) => attachmentFromUpload(arr[idx], u))
      setEditFields(prev => ({...prev, attachments: [...(prev.attachments||[]), ...next]}))
    }catch(err){
      console.error('file upload error', err)
      alert(err.message || 'File upload failed')
    } finally {
      setUploadingEditAttachments(false)
      if(editFileInputRef.current) editFileInputRef.current.value = ''
    }
  }

  function handleEditRemoveAttachment(idx){
    setEditFields(prev => ({...prev, attachments: prev.attachments ? prev.attachments.filter((_,i)=>i!==idx) : []}))
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

  const location = useLocation()
  const filterDifficulty = (() => {
    try { const qp = new URLSearchParams(location.search); return qp.get('difficulty') } catch (e) { return null }
  })()
  const searchQuery = (() => {
    try { const qp = new URLSearchParams(location.search); return (qp.get('q') || '').trim() } catch (e) { return '' }
  })()
  const filterParams = (() => {
    try {
      const qp = new URLSearchParams(location.search)
      return {
        status: parseCsvParam(qp, 'status'),
        issueType: parseCsvParam(qp, 'issueType'),
        sprint: parseCsvParam(qp, 'sprint'),
        priority: parseCsvParam(qp, 'priority'),
        assignee: parseCsvParam(qp, 'assignee'),
        project: parseCsvParam(qp, 'project'),
        dueFrom: (qp.get('dueFrom') || '').trim(),
        dueTo: (qp.get('dueTo') || '').trim()
      }
    } catch (e) {
      return { status: [], issueType: [], sprint: [], priority: [], assignee: [], project: [], dueFrom: '', dueTo: '' }
    }
  })()

  useEffect(() => {
    setTopSearchText(searchQuery || '')
  }, [searchQuery])

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

  function toggleNotifications() {
    setShowNotifications((prev) => !prev)
  }

  function isMobileScreen() {
    return typeof window !== 'undefined' && window.innerWidth <= 768
  }

  function runIssueSearch() {
    const query = (topSearchText || '').trim()
    const params = new URLSearchParams(location.search)
    if (query) params.set('q', query)
    else params.delete('q')

    setMobileSearchOpen(false)
    const qs = params.toString()
    navigate(qs ? `/all-my-issues?${qs}` : '/all-my-issues')
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

  useEffect(()=>{
    async function load(){
      try{
        if (!user?.id) {
          setIssues([])
          return
        }
        const res = await fetch(`${API_BASE}/api/issues`, { headers: { 'X-USER-ID': String(user.id) } })
        if(!res.ok) throw new Error('failed to fetch')
        const data = await res.json()
        // attachmentsJson may be a JSON string; parse into attachments array
        let parsed = data.map(d => ({ ...d, attachments: d.attachmentsJson ? JSON.parse(d.attachmentsJson) : (d.attachments || []) }))
        const orgProjectKeys = new Set((projects || []).map(projectKeyFrom).filter(Boolean).map((key) => key.toUpperCase()))
        const shouldFilterByOrg = Boolean(selectedOrg)
        const orgScoped = shouldFilterByOrg
          ? parsed.filter((it) => {
            const key = issueProjectKeyFrom(it)
            return key && orgProjectKeys.has(key)
          })
          : parsed
        parsed = orgScoped
        if (userEmail || normalizedUserName) {
          parsed = parsed.filter((issue) => isAssignedToUser(issue) || isCreatedByUser(issue))
        }
        // apply difficulty filter if provided via query param
        if(filterDifficulty){
          const wanted = (filterDifficulty || '').toString().toLowerCase()
          parsed = parsed.filter(p => ((p.difficulty || '').toString().toLowerCase() === wanted))
        }
        if (searchQuery) {
          const wanted = searchQuery.toLowerCase()
          parsed = parsed.filter((p) => {
            const key = (p.key || p.issueKey || p.id || '').toString().toLowerCase()
            const title = (p.summary || p.title || '').toString().toLowerCase()
            const description = stripHtml(p.description).toLowerCase()
            const project = (p.project || p.projectName || '').toString().toLowerCase()
            const type = (p.issueType || p.type || '').toString().toLowerCase()
            const status = (p.status || p.issueStatus || '').toString().toLowerCase()
            const priority = (p.priority || p.difficulty || '').toString().toLowerCase()
            const assignee = (p.assigneeName || p.assignee || p.assigneeEmail || '').toString().toLowerCase()
            const creator = (p.creatorName || p.creatorEmail || '').toString().toLowerCase()
            return (
              key.includes(wanted) ||
              title.includes(wanted) ||
              description.includes(wanted) ||
              project.includes(wanted) ||
              type.includes(wanted) ||
              status.includes(wanted) ||
              priority.includes(wanted) ||
              assignee.includes(wanted) ||
              creator.includes(wanted)
            )
          })
        }
        if (filterParams.project.length) {
          parsed = parsed.filter((p) => filterParams.project.includes((p.project || p.projectKey || p.projectId || '').toString().toLowerCase()))
        }
        if (filterParams.issueType.length) {
          parsed = parsed.filter((p) => filterParams.issueType.includes((p.issueType || p.type || '').toString().toLowerCase()))
        }
        if (filterParams.sprint.length) {
          parsed = parsed.filter((p) => {
            const sprint = (p.sprintId || p.sprint || '').toString().trim().toLowerCase()
            return filterParams.sprint.includes(sprint)
          })
        }
        if (filterParams.priority.length) {
          parsed = parsed.filter((p) => {
            const priorityOrDifficulty = (p.priority || p.difficulty || '').toString().toLowerCase()
            return filterParams.priority.includes(priorityOrDifficulty)
          })
        }
        if (filterParams.assignee.length) {
          parsed = parsed.filter((p) => {
            const assignee = (p.assigneeName || p.assignee || p.assigneeEmail || '').toString().toLowerCase()
            return filterParams.assignee.includes(assignee)
          })
        }
        if (filterParams.status.length) {
          parsed = parsed.filter((p) => {
            const status = normalizeStatus(p.status || p.issueStatus)
            return filterParams.status.includes(status)
          })
        }
        if (filterParams.dueFrom || filterParams.dueTo) {
          parsed = parsed.filter((p) => {
            const issueDate = normalizeDeadlineDate(p.deadlineDate || p.dueDate || p.deadline || p.createdAt)
            if (!issueDate) return false
            if (filterParams.dueFrom && issueDate < filterParams.dueFrom) return false
            if (filterParams.dueTo && issueDate > filterParams.dueTo) return false
            return true
          })
        }
        // show newest first
        setIssues(parsed.slice().reverse())
      }catch(e){
        console.error('load issues failed', e)
        setIssues([])
      }
    }
    load()
  },[API_BASE, location.search, projects, selectedOrg, userEmail, normalizedUserName, user?.id])

  function openEdit(idx){
    const item = issues[idx]
    if(!item) return
    setEditFields({
      id: item.id,
      project: item.project || '',
      issueType: item.issueType || 'Story',
      epicName: item.epicName || '',
      summary: item.summary || '',
      description: item.description || '',
      attachments: item.attachments || []
      ,difficulty: item.difficulty || 'Medium'
    })
    setEditErrors({})
    setEditingIndex(idx)
  }

  function closeEdit(){ setEditingIndex(-1); setEditFields({ project:'', issueType:'Story', epicName:'', summary:'', description:'', attachments:[] }); setEditErrors({}) }

  function saveEdit(){
    const errs = {}
    if(!editFields.summary || editFields.summary.trim()==='') errs.summary = 'Summary required'
    if(!editFields.project || editFields.project.trim()==='') errs.project = 'Project required'
    if(!editFields.issueType || editFields.issueType.trim()==='') errs.issueType = 'Issue type required'
    if(editFields.issueType==='Epic' && (!editFields.epicName || editFields.epicName.trim()==='')) errs.epicName = 'Epic name required'
    setEditErrors(errs)
    if(Object.keys(errs).length>0) return
    // send update to backend
    try{
      const id = editFields.id
      const payload = {
        project: editFields.project,
        issueType: editFields.issueType,
        epicName: editFields.epicName,
        summary: editFields.summary,
        description: editFields.description,
        attachmentsJson: JSON.stringify(editFields.attachments || []),
        difficulty: editFields.difficulty || null
      }
      fetch(`${API_BASE}/api/issues/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type':'application/json', 'X-USER-ID': String(user?.id || '') },
        body: JSON.stringify(payload)
      })
        .then(res => {
          if(!res.ok) throw new Error('update failed')
          return res.json()
        })
        .then(()=>{
          // refresh list
          return fetch(`${API_BASE}/api/issues`, { headers: { 'X-USER-ID': String(user?.id || '') } })
        })
        .then(r=>r.json())
        .then(data=>{
          const parsed = data.map(d => ({ ...d, attachments: d.attachmentsJson ? JSON.parse(d.attachmentsJson) : (d.attachments || []) }))
          setIssues(parsed.slice().reverse())
          closeEdit()
          refreshNotifications?.()
        })
        .catch(err=>{ console.error(err); alert('Failed to update issue') })
    }catch(e){ console.error(e) }
  }

  function handleDelete(idx){
    if(!window.confirm('Delete this issue?')) return
    try{
      const item = issues[idx]
      if(!item) return
      fetch(`${API_BASE}/api/issues/${item.id}`, { method: 'DELETE', headers: { 'X-USER-ID': String(user?.id || '') } })
        .then(res => {
          if(!res.ok) throw new Error('delete failed')
          return fetch(`${API_BASE}/api/issues`, { headers: { 'X-USER-ID': String(user?.id || '') } })
        })
        .then(r=>r.json())
        .then(data=>{
          const parsed = data.map(d => ({ ...d, attachments: d.attachmentsJson ? JSON.parse(d.attachmentsJson) : (d.attachments || []) }))
          setIssues(parsed.slice().reverse())
          refreshNotifications?.()
        })
        .catch(err=>{ console.error(err); alert('Failed to delete issue') })
    }catch(e){ console.error(e) }
  }

  function handleLogout(){
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

  return (
    <div className="dashboard-root d-flex">
      <aside className={`sidebar d-flex flex-column ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-top">
          <div className="brand d-flex align-items-center">
            <div className="brand-logo">KP</div>
            <div className="brand-name">KavyaProMan</div>
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
              <div className="avatar-icon">{avatarInitials}</div>
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

      {/* single toggle button handles large and small screens */}
      <button className="mobile-toggle btn btn-sm" onClick={toggleSidebarForScreen} aria-label="Toggle sidebar">
        <FiMenu size={18} />
      </button>

      <div className={`mobile-overlay ${mobileOpen ? 'show' : ''}`} onClick={() => { setMobileOpen(false); setCollapsed(true) }} />

      <main className={`content flex-grow-1 p-4 ${collapsed ? 'with-topbar' : ''}`}>
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
              type="button"
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
                  {!notificationsLoading && notifications.length > 0 && notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`notification-item-row ${n.read ? 'read' : 'unread'}`}
                      data-variant={n.variant}
                      onClick={() => {
                        markAsRead(n.id)
                        setShowNotifications(false)
                        if (n.href) navigate(n.href)
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          markAsRead(n.id)
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
            <button className="btn create-issue-medium" onClick={() => navigate('/create-issue')} type="button">
              <FiPlus className="me-1" /> Create Issue
            </button>
          )}
        </div>

        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <button className="view-all-btn" onClick={()=>navigate('/dashboard')}><FiArrowLeft /> Back</button>
          <h2 style={{margin:0}}>All My Issues</h2>
        </div>

        <div className="all-my-issues-grid">
          {issues.length === 0 && <div className="filter-card">No issues found. Create one from Dashboard.</div>}
          {issues.map((it, idx)=> (
            <div key={idx} className="filter-card">
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <div style={{fontWeight:700}}>{it.summary}</div>
                  <div style={{color:'#6b7280',marginTop:6}}>{it.project} • {it.issueType}</div>
                </div>
                <div style={{textAlign:'right', display:'flex', alignItems:'center', gap:8}}>
                  {/* <div style={{fontWeight:700}}>{it.attachments?.length || 0} files</div> */}
                  <div style={{color:'#6b7280',fontSize:12,marginTop:6}}>{new Date(it.createdAt).toLocaleString()}</div>
                  <button title="Edit" className="icon-btn" onClick={()=>openEdit(idx)}><FiEdit /></button>
                  <button title="Delete" className="icon-btn" onClick={()=>handleDelete(idx)}><FiTrash2 /></button>
                </div>
              </div>

              <div style={{marginTop:10, display:'flex', alignItems:'center', gap:12}}>
                <div style={{color:'#374151',fontWeight:700, fontSize:13}}>Difficulty</div>
                <div className="difficulty-group" title="Difficulty is fixed after creation">
                  <div className="difficulty-radio high">
                    <input id={`diff-${idx}-high`} type="radio" name={`difficulty-${idx}`} checked={it.difficulty === 'High'} disabled readOnly />
                    <label htmlFor={`diff-${idx}-high`}><span className="dot"/>High</label>
                  </div>
                  <div className="difficulty-radio medium">
                    <input id={`diff-${idx}-medium`} type="radio" name={`difficulty-${idx}`} checked={!it.difficulty || it.difficulty === 'Medium'} disabled readOnly />
                    <label htmlFor={`diff-${idx}-medium`}><span className="dot"/>Medium</label>
                  </div>
                  <div className="difficulty-radio low">
                    <input id={`diff-${idx}-low`} type="radio" name={`difficulty-${idx}`} checked={it.difficulty === 'Low'} disabled readOnly />
                    <label htmlFor={`diff-${idx}-low`}><span className="dot"/>Low</label>
                  </div>
                </div>
              </div>

              <div style={{marginTop:12,color:'#374151'}} dangerouslySetInnerHTML={{__html: it.description || '<i>(no description)</i>'}} />

              {it.attachments && it.attachments.length > 0 && (
                <div style={{marginTop:12,display:'flex',flexWrap:'wrap',gap:8}}>
                  {it.attachments.map((f,i)=> (
                    <div key={i} className="attachment-item" title={f.name}>
                      {(f.url || f.data) ? (
                        <button type="button" className="attachment-name link-like" onClick={(e)=>{ e.preventDefault(); downloadAttachment(f) }}>{f.name}</button>
                      ) : (
                        <span>{f.name}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* file count badge */}
              <div className="file-badge">{(it.attachments && it.attachments.length) || 0} files</div>
            </div>
          ))}
        </div>
      </main>

      {editingIndex > -1 && (
        <div className="create-issue-overlay" onClick={closeEdit}>
          <div className="create-issue-container" role="dialog" aria-modal="true" onClick={e=>e.stopPropagation()}>
            <div className="create-issue-header d-flex align-items-center">
              <h4>Edit issue</h4>
              <div className="ms-auto d-flex gap-2">
                <button className="btn btn-link modal-close" onClick={closeEdit} title="Close"><FiArrowLeft size={18} /></button>
              </div>
            </div>

            <div className="create-issue-form">
              <div className="form-row select-row">
                <label>Project*</label>
                <div className="select-control">
                  <select className={`form-control project-select ${editErrors.project ? 'invalid' : ''}`} value={editFields.project}
                    onChange={e=>setEditFields(prev=>({...prev, project:e.target.value}))}>
                    <option>Zapier Content (ZC)</option>
                    <option>KavyaProMan 360</option>
                    <option>Website Redesign</option>
                    <option>Mobile App</option>
                  </select>
                  {editErrors.project && <div className="error-text">{editErrors.project}</div>}
                </div>
              </div>

              <div className="form-row two-col">
                <div>
                  <label className='mb-2'>Issue Type*</label>
                  <select className={`form-control ${editErrors.issueType ? 'invalid' : ''}`} value={editFields.issueType} onChange={e=>setEditFields(prev=>({...prev, issueType:e.target.value}))}>
                    <option>Epic</option>
                    <option>Story</option>
                    <option>Task</option>
                    <option>Bug</option>
                  </select>
                </div>

                <div>
                  <label className='mb-2'>Epic Name*</label>
                  <input className={`form-control ${editErrors.epicName ? 'invalid' : ''}`} placeholder="Epic name" value={editFields.epicName} onChange={e=>setEditFields(prev=>({...prev, epicName:e.target.value}))} />
                </div>
              </div>

              <div className="form-row">
                <label>Summary*</label>
                <input className={`form-control summary-input ${editErrors.summary ? 'invalid' : ''}`} value={editFields.summary} onChange={e=>setEditFields(prev=>({...prev, summary:e.target.value}))} />
              </div>

              <div className="form-row">
                <label>Description</label>
                <div className="form-row">
                  <label>Difficulty</label>
                  <div className="difficulty-group" title="Difficulty is fixed after creation">
                    <div className="difficulty-radio high">
                      <input id="edit-diff-high" type="radio" name="edit-difficulty" checked={editFields.difficulty==='High'} disabled readOnly />
                      <label htmlFor="edit-diff-high"><span className="dot"/>High</label>
                    </div>
                    <div className="difficulty-radio medium">
                      <input id="edit-diff-medium" type="radio" name="edit-difficulty" checked={editFields.difficulty==='Medium'} disabled readOnly />
                      <label htmlFor="edit-diff-medium"><span className="dot"/>Medium</label>
                    </div>
                    <div className="difficulty-radio low">
                      <input id="edit-diff-low" type="radio" name="edit-difficulty" checked={editFields.difficulty==='Low'} disabled readOnly />
                      <label htmlFor="edit-diff-low"><span className="dot"/>Low</label>
                    </div>
                  </div>
                </div>
                <div className="toolbar format-toolbar">
                  <button type="button" className="format-btn" onMouseDown={e=>e.preventDefault()} onClick={()=>document.execCommand('bold')} aria-label="Bold"><strong>B</strong></button>
                  <button type="button" className="format-btn" onMouseDown={e=>e.preventDefault()} onClick={()=>document.execCommand('italic')} aria-label="Italic"><em>I</em></button>
                  <button type="button" className="format-btn" onMouseDown={e=>e.preventDefault()} onClick={()=>document.execCommand('underline')} aria-label="Underline"><u>U</u></button>

                  <div className="align-group">
                    <button type="button" className="format-btn align-btn" onMouseDown={e=>e.preventDefault()} onClick={()=>document.execCommand('justifyLeft')} title="Align left"><FiAlignLeft /></button>
                    <button type="button" className="format-btn align-btn" onMouseDown={e=>e.preventDefault()} onClick={()=>document.execCommand('justifyCenter')} title="Center"><FiAlignCenter /></button>
                    <button type="button" className="format-btn align-btn" onMouseDown={e=>e.preventDefault()} onClick={()=>document.execCommand('justifyRight')} title="Align right"><FiAlignRight /></button>
                    <button type="button" className="format-btn align-btn" onMouseDown={e=>e.preventDefault()} onClick={()=>document.execCommand('justifyFull')} title="Justify"><FiAlignJustify /></button>
                  </div>

                  <input type="color" className="color-input" defaultValue="#10b981" onMouseDown={e=>e.preventDefault()} onChange={(e)=>document.execCommand('foreColor', false, e.target.value)} title="Text color" />
                  <button type="button" className="format-btn upload-btn" onMouseDown={e=>e.preventDefault()} onClick={()=>editFileInputRef.current?.click()} title={uploadingEditAttachments ? 'Uploading...' : 'Attach files'} disabled={uploadingEditAttachments}>
                    <FiUpload />
                  </button>
                  <input type="file" ref={editFileInputRef} style={{display:'none'}} accept=".pdf,image/*,.doc,.docx" multiple onChange={(e)=>{ handleEditAddFiles(e.target.files) }} />
                </div>

                <div ref={editDescRef} className="form-control description-area" contentEditable={true} suppressContentEditableWarning onInput={e=>setEditFields(prev=>({...prev, description: editDescRef.current?.innerHTML || ''}))} dangerouslySetInnerHTML={{__html: editFields.description}} />

                {editFields.attachments && editFields.attachments.length > 0 && (
                  <div className="attachments" style={{marginTop:8}}>
                    {editFields.attachments.map((f,i)=> (
                      <div className="attachment-item" key={i} title={f.name}>
                        {(f.url || f.data) ? (
                          <button type="button" className="attachment-name link-like" onClick={(e)=>{ e.preventDefault(); downloadAttachment(f) }}>{f.name}</button>
                        ) : (
                          <span className="attachment-name">{f.name}</span>
                        )}
                        <button type="button" className="remove-attachment" onMouseDown={e=>e.preventDefault()} onClick={()=>handleEditRemoveAttachment(i)} title="Remove">
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
                  <button type="button" className="btn btn-outline-secondary cancel-btn" onClick={closeEdit}>Cancel</button>
                  <button type="button" className="btn btn-primary create-btn" onClick={saveEdit} disabled={uploadingEditAttachments}>Save</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
