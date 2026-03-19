import { useNavigate, NavLink, useLocation } from 'react-router-dom'
import './Subscription.css'
import './Dashboard.css'
import { FiSearch, FiBell, FiPlus, FiZap, FiStar, FiCheck, FiGrid, FiFolder, FiUsers, FiBarChart2, FiCreditCard, FiSettings, FiLogOut, FiMenu, FiBriefcase, FiServer, FiDownload, FiArrowRight, FiChevronDown, FiX, FiRepeat } from 'react-icons/fi'
import { GiCrown } from 'react-icons/gi'
import { useState, useEffect, useMemo, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import API_BASE from '../config/api'
import useIssueNotifications from '../hooks/useIssueNotifications'

const getAvatarInitials = (name, email) => {
  const source = (name || '').trim() || (email || '').trim()
  if (!source) return 'G'
  const parts = source.split(/[\s._-]+/).filter(Boolean)
  if (parts.length === 0) return source.charAt(0).toUpperCase()
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase()
}
const normalizeRole = (role) => (role || '').trim().toLowerCase()

export default function Subscription() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, clearUser } = useAuth()
  const displayName = user?.name || (user?.email ? user.email.split('@')[0] : 'Guest')
  const avatarInitials = getAvatarInitials(user?.name, user?.email)
  const isDeveloper = normalizeRole(user?.role) === 'developer'
  const DEFAULT_PLAN = 'free'
  const normalizePlan = (value) => {
    const key = String(value || '').trim().toLowerCase()
    if (!key) return DEFAULT_PLAN
    if (key === 'pro' || key.includes('professional')) return 'professional'
    if (key.includes('business')) return 'business'
    if (key.includes('enterprise')) return 'enterprise'
    if (key.includes('free')) return 'free'
    return DEFAULT_PLAN
  }
  const normalizeBilling = (value) => {
    const key = String(value || '').trim().toLowerCase()
    return key === 'yearly' ? 'yearly' : 'monthly'
  }
  const formatPlanLabel = (value) => {
    const plan = normalizePlan(value)
    return plan.charAt(0).toUpperCase() + plan.slice(1)
  }
  const addMonths = (date, count) => {
    const next = new Date(date.getTime())
    const day = next.getDate()
    next.setMonth(next.getMonth() + count)
    if (next.getDate() < day) {
      next.setDate(0)
    }
    return next
  }
  const addYears = (date, count) => {
    const next = new Date(date.getTime())
    const day = next.getDate()
    next.setFullYear(next.getFullYear() + count)
    if (next.getDate() < day) {
      next.setDate(0)
    }
    return next
  }
  const computeExpiryDate = (purchasedAt, billingCycle, planValue) => {
    const planKey = normalizePlan(planValue)
    if (planKey === 'free') return null
    if (!purchasedAt) return null
    const start = new Date(purchasedAt)
    if (Number.isNaN(start.getTime())) return null
    const cycle = normalizeBilling(billingCycle)
    return cycle === 'yearly' ? addYears(start, 1) : addMonths(start, 1)
  }
  const [selectedOrg, setSelectedOrg] = useState(() => {
    try { return typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('org') || 'null') : null } catch (e) { return null }
  })
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [period, setPeriod] = useState('monthly')
  const [currentPlan, setCurrentPlan] = useState(DEFAULT_PLAN)
  const [currentBillingCycle, setCurrentBillingCycle] = useState('monthly')
  const [selectedPlan, setSelectedPlan] = useState(DEFAULT_PLAN)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [topSearchText, setTopSearchText] = useState('')
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [modalPlan, setModalPlan] = useState(null)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('card')
  const [upiCopied, setUpiCopied] = useState(false)
  const [showSwitchModal, setShowSwitchModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [payments, setPayments] = useState([])
  const [paymentsLoading, setPaymentsLoading] = useState(false)
  const invoiceListScrollable = payments.length > 3
  const currentPlanKey = normalizePlan(currentPlan)
  const isFreePlan = currentPlanKey === 'free'
  const activeEntitlements = useMemo(() => {
    const now = Date.now()
    const map = new Map()
    payments.forEach((payment) => {
      const planKey = normalizePlan(payment?.planName)
      if (planKey === 'free') return
      const billingCycle = normalizeBilling(payment?.billingCycle)
      const expiresAt = computeExpiryDate(payment?.createdAt, billingCycle, planKey)
      if (!expiresAt || expiresAt.getTime() <= now) return
      const existing = map.get(planKey)
      if (!existing || expiresAt.getTime() > existing.expiresAt.getTime()) {
        map.set(planKey, {
          planKey,
          billingCycle,
          purchasedAt: payment?.createdAt,
          expiresAt
        })
      }
    })
    return map
  }, [payments])
  const professionalEntitlement = activeEntitlements.get('professional')
  const businessEntitlement = activeEntitlements.get('business')
  const enterpriseEntitlement = activeEntitlements.get('enterprise')
  const purchasedPlans = useMemo(() => {
    const map = new Map()
    payments.forEach((payment) => {
      const planKey = normalizePlan(payment?.planName)
      if (planKey === 'free') return
      const purchasedAt = payment?.createdAt
      if (!purchasedAt) return
      const existing = map.get(planKey)
      const existingTime = existing?.purchasedAt ? new Date(existing.purchasedAt).getTime() : 0
      const nextTime = new Date(purchasedAt).getTime()
      if (!existing || nextTime >= existingTime) {
        const billingCycle = normalizeBilling(payment?.billingCycle)
        const expiresAt = computeExpiryDate(purchasedAt, billingCycle, planKey)
        map.set(planKey, {
          planKey,
          planLabel: formatPlanLabel(planKey),
          billingCycle,
          purchasedAt,
          expiresAt
        })
      }
    })
    return Array.from(map.values())
  }, [payments])
  const switchOptions = useMemo(() => ([
    {
      planKey: 'free',
      planLabel: 'Free',
      billingCycle: 'monthly',
      purchasedAt: null,
      expiresAt: null,
      isFree: true
    },
    ...purchasedPlans
  ]), [purchasedPlans])
  const {
    notifications,
    unreadCount,
    loading: notificationsLoading,
    error: notificationsError,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    clearAllNotifications
  } = useIssueNotifications({ limit: 6 })
  const notificationRef = useRef(null)
  const topSearchInputRef = useRef(null)
  const freePlanRef = useRef(null)
  const professionalPlanRef = useRef(null)
  const businessPlanRef = useRef(null)
  const enterprisePlanRef = useRef(null)

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
  

  return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const toggleNotifications = () => setShowNotifications(prev => !prev)

  function handleLogout() {
    clearUser()
    navigate('/login', { replace: true })
  }

  const prices = { free: { monthly: 'Free', yearly: 'Free' }, pro: { monthly: '$12', yearly: '$120' } }
  const [openFaq, setOpenFaq] = useState(null)

  const faqs = [
    { q: 'Can I change plans anytime?', a: "Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate any charges." },
    { q: 'What happens if I exceed my plan limits?', a: "We'll notify you when you're approaching your limits. You can upgrade your plan or contact our team for temporary extensions." },
    { q: 'Do you offer refunds?', a: "Yes, we offer a 30-day money-back guarantee on all paid plans. No questions asked." },
    { q: 'Is there a discount for annual billing?', a: "Yes! When you choose annual billing, you get 2 months free (17% discount)." }
  ]

  function toggleFaq(i) { setOpenFaq(prev => prev === i ? null : i) }

  const formatPaymentDate = (value) => {
    if (!value) return 'N/A'
    const date = new Date(value)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  const formatPaymentAmount = (value, currency) => {
    const amount = typeof value === 'number' ? value : Number(value || 0)
    const prefix = currency || 'USD'
    return `${prefix} ${amount.toFixed(2)}`
  }
  const formatDateValue = (value) => {
    if (!value) return 'N/A'
    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) return 'N/A'
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  const applyCurrentSubscription = (planValue, billingValue) => {
    const normalizedPlan = normalizePlan(planValue)
    const normalizedBilling = normalizeBilling(billingValue)
    setCurrentPlan(normalizedPlan)
    setCurrentBillingCycle(normalizedBilling)
    setSelectedPlan(normalizedPlan)
    setPeriod(normalizedBilling)
  }

  const updateCurrentSubscription = async (planValue, billingValue, purchasedAtOverride) => {
    const normalizedPlan = normalizePlan(planValue)
    const normalizedBilling = normalizeBilling(billingValue)
    const payload = {
      planName: formatPlanLabel(normalizedPlan),
      billingCycle: normalizedBilling
    }
    if (purchasedAtOverride) {
      const parsed = new Date(purchasedAtOverride)
      if (!Number.isNaN(parsed.getTime())) {
        payload.purchasedAt = parsed.toISOString()
      }
    }

    try {
      const headers = { 'Content-Type': 'application/json' }
      if (user?.id) headers['X-USER-ID'] = String(user.id)
      const res = await fetch(`${API_BASE}/api/subscription/current`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        const data = await res.json()
        applyCurrentSubscription(data?.planName || normalizedPlan, data?.billingCycle || normalizedBilling)
        return
      }
    } catch (err) {
      // Ignore and fallback to local update for demo flow
    }

    applyCurrentSubscription(normalizedPlan, normalizedBilling)
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

  // load current subscription once on mount
  useEffect(() => {
    let isMounted = true

    async function loadCurrentSubscription() {
      try {
        const headers = {}
        if (user?.id) headers['X-USER-ID'] = String(user.id)
        const res = await fetch(`${API_BASE}/api/subscription/current`, { headers })
        if (!res.ok) return
        const data = await res.json()
        if (!isMounted) return
        applyCurrentSubscription(data?.planName, data?.billingCycle)
      } catch (err) {
        // Keep defaults if the API is unavailable
      }
    }

    loadCurrentSubscription()
    return () => { isMounted = false }
  }, [user?.id])

  // load billing history
  useEffect(() => {
    let isMounted = true

    async function loadPayments() {
      setPaymentsLoading(true)
      try {
        const headers = {}
        if (user?.id) headers['X-USER-ID'] = String(user.id)
        const res = await fetch(`${API_BASE}/api/payment`, { headers })
        if (!res.ok) return
        const data = await res.json()
        if (!isMounted) return
        setPayments(Array.isArray(data) ? data : [])
      } catch (err) {
        // keep empty on error
      } finally {
        if (isMounted) setPaymentsLoading(false)
      }
    }

    loadPayments()
    return () => { isMounted = false }
  }, [user?.id])

  // highlight a specific plan when redirected from other pages
  useEffect(() => {
    const targetPlan = normalizePlan(location?.state?.highlightPlan)
    if (!location?.state?.highlightPlan) return

    setSelectedPlan(targetPlan)

    const refMap = {
      free: freePlanRef,
      professional: professionalPlanRef,
      business: businessPlanRef,
      enterprise: enterprisePlanRef
    }
    if (location?.state?.scrollToPlan) {
      const targetRef = refMap[targetPlan]
      targetRef?.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [location?.state?.highlightPlan, location?.state?.scrollToPlan])

  // preset preferred payment method when coming from update payment page
  useEffect(() => {
    if (!location?.state?.paymentMethod) return
    const nextMethod = location.state.paymentMethod === 'upi' ? 'upi' : 'card'
    setSelectedPaymentMethod(nextMethod)
  }, [location?.state?.paymentMethod])

  // apply current plan passed from other pages (e.g., after upgrade flow)
  useEffect(() => {
    if (!location?.state?.currentPlan) return
    applyCurrentSubscription(location.state.currentPlan, location.state.billingCycle || currentBillingCycle)
  }, [location?.state?.currentPlan, location?.state?.billingCycle])

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

  function toggleSidebarForScreen() {
    setCollapsed((prev) => {
      const next = !prev
      if (typeof window !== 'undefined' && window.innerWidth < 992) {
        setMobileOpen(!next)
      }
      return next
    })
  }

  async function handleConfirmSubscribe() {
    const planValue = modalPlan || selectedPlan
    if (!planValue) return
    setShowUpgradeModal(false)
    navigate('/payment', { state: { plan: planValue, billingCycle: period, paymentMethod: selectedPaymentMethod } })
  }

  async function handleStartFree() {
    await updateCurrentSubscription('free', currentBillingCycle || period)
  }

  async function handleSwitchToPlan(planKey, entitlement) {
    const normalizedPlan = normalizePlan(planKey)
    if (normalizedPlan === 'free') {
      await updateCurrentSubscription('free', currentBillingCycle || period)
      return
    }
    const billingCycle = entitlement?.billingCycle || currentBillingCycle || period
    const purchasedAt = entitlement?.purchasedAt
    await updateCurrentSubscription(normalizedPlan, billingCycle, purchasedAt)
    setShowSwitchModal(false)
  }

  async function handleCancelSubscription() {
    const nextBilling = currentBillingCycle || 'monthly'
    await updateCurrentSubscription('free', nextBilling)
  }

  async function confirmCancelSubscription() {
    await handleCancelSubscription()
    setShowCancelModal(false)
  }

  async function handleDownloadInvoice(paymentId) {
    try {
      if (!paymentId) return
      const invoiceUrl = `${API_BASE}/api/payment/${paymentId}/invoice`
      const opened = window.open(invoiceUrl, '_blank', 'noopener,noreferrer')
      if (opened) return

      const headers = {}
      if (user?.id) headers['X-USER-ID'] = String(user.id)
      const res = await fetch(invoiceUrl, { headers })
      if (!res.ok) return
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `invoice-${paymentId}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      // ignore download errors
    }
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

return (
    <div className="dashboard-root d-flex">
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
              <NavLink to="/dashboard" className={({isActive})=> `nav-item d-flex align-items-center mb-2 ${isActive? 'active':''}`}>
                <FiGrid className="me-3 nav-icon"/> <span className="nav-text">Dashboard</span>
              </NavLink>
              <NavLink to="/projects" className={({isActive})=> `nav-item d-flex align-items-center mb-2 ${isActive? 'active':''}`}>
                <FiFolder className="me-3 nav-icon"/> <span className="nav-text">Projects</span>
              </NavLink>
              <NavLink to="/teams" className={({isActive})=> `nav-item d-flex align-items-center mb-2 ${isActive? 'active':''}`}>
                <FiUsers className="me-3 nav-icon"/> <span className="nav-text">Teams</span>
              </NavLink>
              <NavLink to="/reports" className={({isActive})=> `nav-item d-flex align-items-center mb-2 ${isActive? 'active':''}` }>
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

      {/* mobile toggle button (same as Dashboard) */}
      <button className="mobile-toggle btn btn-sm" onClick={toggleSidebarForScreen} aria-label="Toggle sidebar">
        <FiMenu size={18} />
      </button>

      <main className={`content flex-grow-1 p-4 ${collapsed ? 'with-topbar' : ''}`}>
        <div className={`mobile-overlay ${mobileOpen ? 'show' : ''}`} onClick={() => { setMobileOpen(false); setCollapsed(true) }} />
        <div className="main-body">
          <header className="dash-header mb-4">
            <div>
              <div className="top-search-row mb-3 d-flex align-items-center">
                <div
                  className="input-group top-search-medium"
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
                </div>

                <div className="notification-wrapper me-2" ref={notificationRef}>
                  <button className="btn btn-link bell-black" title="Notifications" onClick={toggleNotifications}>
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
                  <button className="btn create-issue-medium dark" onClick={() => navigate('/create-issue')}>
                    <FiPlus className="me-1" /> Create Issue
                  </button>
                )}
              </div>

              <div className="text-center">
                <div className="current-plan-badge mb-2"> <GiCrown /> Current Plan: <strong>{formatPlanLabel(currentPlan)}</strong></div>
                <h1 className="mb-1">Choose Your Plan</h1>
                <div className="text-muted mb-3">Select the perfect plan for your team. Upgrade, downgrade, or cancel anytime.</div>

                <div className="period-toggle d-inline-flex align-items-center">
                  <button type="button" className={`toggle-label ${period === 'monthly' ? 'active' : ''}`} onClick={() => setPeriod('monthly')}>Monthly</button>
                  <button className={`switch ${period === 'yearly' ? 'on' : ''}`} onClick={() => setPeriod(p => p === 'monthly' ? 'yearly' : 'monthly')} aria-pressed={period === 'yearly'}>
                    <span className="knob" />
                  </button>
                  <button type="button" className={`toggle-label ${period === 'yearly' ? 'active' : ''}`} onClick={() => setPeriod('yearly')}>Yearly</button>
                </div>
              </div>
            </div>
          </header>

          {/* Mobile search overlay: opens when the compact search pill is tapped */}
          {mobileSearchOpen && (
            <div className="mobile-search-overlay" role="dialog" aria-modal="true" onClick={() => setMobileSearchOpen(false)}>
              <div className="mobile-search-box" onClick={(e) => e.stopPropagation()}>
                <div className="input-group">
                  <button
                    type="button"
                    className="input-group-text"
                    aria-label="Search"
                    onClick={(event) => {
                      event.preventDefault()
                      const query = (topSearchText || '').trim()
                      if (!query) return
                      setMobileSearchOpen(false)
                      runIssueSearch()
                    }}
                  >
                    <FiSearch />
                  </button>
                  <input
                    autoFocus
                    className="form-control"
                    placeholder="Search issues, projects..."
                    aria-label="Mobile search input"
                    value={topSearchText}
                    onChange={(event) => setTopSearchText(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        setMobileSearchOpen(false)
                        runIssueSearch()
                      }
                    }}
                  />
                  <button className="btn btn-link ms-2" aria-label="Close search" onClick={() => setMobileSearchOpen(false)}><FiX size={20} /></button>
                </div>
              </div>
            </div>
          )}

          {/* Upgrade modal */}
          {showUpgradeModal && (
            <div className="upgrade-modal-overlay" onClick={() => setShowUpgradeModal(false)}>
              <div className="upgrade-modal" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close btn btn-link" onClick={() => setShowUpgradeModal(false)}>{'\u00d7'}</button>
                <h3>Upgrade to {modalPlan ? modalPlan.charAt(0).toUpperCase() + modalPlan.slice(1) : ''} Plan</h3>
                <div className="modal-price">{modalPlan === 'professional' ? '$19' : modalPlan === 'business' ? '$25' : modalPlan === 'enterprise' ? 'Custom' : 'Free'} <span className="small-muted">/month</span></div>
                <ul className="modal-features">
                  <li>Full Access</li>
                  <li>Priority Support</li>
                  <li>Advanced Analytics</li>
                </ul>

                <div className="modal-payments">
                  <div className={`payment-option ${selectedPaymentMethod === 'card' ? 'selected' : ''}`} onClick={() => setSelectedPaymentMethod('card')}>Credit Card</div>
                  <div className={`payment-option ${selectedPaymentMethod === 'upi' ? 'selected' : ''}`} onClick={() => setSelectedPaymentMethod('upi')}>UPI</div>
                </div>

                {/* Small visual preview for selected payment */}
                <div className="payment-preview">
                  {selectedPaymentMethod === 'card' && (
                    <div className="card-preview">
                      <div className="card-chip" />
                      <div className="card-number">{'\u2022\u2022\u2022\u2022 4242'}</div>
                      <div className="card-meta"><div>JOHN DOE</div><div>12/26</div></div>
                    </div>
                  )}

                  {selectedPaymentMethod === 'upi' && (
                      <div className="upi-preview">
                        <div className="upi-card">
                          <div className="upi-left">
                            <div className="upi-brand">UPI</div>
                            <div className="upi-id">example@upi</div>
                          </div>
                          <div className="upi-right">
                            <button className="btn btn-sm btn-outline-secondary copy-btn" onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText('example@upi'); setUpiCopied(true); setTimeout(() => setUpiCopied(false), 1400); }}>
                              {upiCopied ? 'Copied' : 'Copy'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                </div>

                  <div className="modal-actions">
                  <button className="btn btn-warning" onClick={handleConfirmSubscribe}>Confirm & Subscribe</button>
                  <button className="btn btn-outline-secondary" onClick={() => setShowUpgradeModal(false)}>Cancel</button>
                </div>
              </div>
            </div>
          )}

          {showSwitchModal && (
            <div className="upgrade-modal-overlay" onClick={() => setShowSwitchModal(false)}>
              <div className="upgrade-modal switch-modal" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close btn btn-link" onClick={() => setShowSwitchModal(false)} aria-label="Close">
                  <FiX size={18} />
                </button>
                <div className="switch-modal-header">
                  <h3>Switch Plan</h3>
                  <div className="switch-modal-subtitle">Choose from your purchased plans or move to Free.</div>
                </div>

                {switchOptions.length === 1 ? (
                  <div className="text-muted">No purchased plans yet.</div>
                ) : (
                  <div className="switch-plan-list">
                    {switchOptions.map((plan) => {
                      const isActive = plan.isFree || (plan.expiresAt && plan.expiresAt.getTime() > Date.now())
                      const isCurrent = currentPlanKey === plan.planKey
                      return (
                        <div className={`switch-plan-row ${isActive ? 'active' : 'expired'}`} key={plan.planKey}>
                          <div className="switch-plan-main">
                            <div className="switch-plan-title">{plan.planLabel}</div>
                            {plan.isFree ? (
                              <>
                                <div className="switch-plan-meta">Forever free â€¢ No payment required</div>
                                <div className="switch-plan-expiry">No expiry</div>
                              </>
                            ) : (
                              <>
                                <div className="switch-plan-meta">
                                  {plan.billingCycle === 'yearly' ? 'Yearly' : 'Monthly'} â€¢ Purchased {formatDateValue(plan.purchasedAt)}
                                </div>
                                <div className="switch-plan-expiry">
                                  Expires {formatDateValue(plan.expiresAt)}
                                </div>
                              </>
                            )}
                          </div>
                          <div className="switch-plan-actions">
                            <span className={`switch-plan-status ${isActive ? 'active' : 'expired'}`}>
                              {plan.isFree ? 'Free' : (isActive ? 'Active' : 'Expired')}
                            </span>
                            <button
                              className={`btn switch-plan-cta ${isCurrent ? 'switch-plan-current' : 'switch-plan-action'}`}
                              onClick={() => handleSwitchToPlan(plan.planKey, plan)}
                              disabled={!isActive || isCurrent}
                            >
                              {isCurrent ? 'Current' : 'Switch'}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                <div className="modal-actions">
                  <button className="btn btn-outline-secondary" onClick={() => setShowSwitchModal(false)}>Close</button>
                </div>
              </div>
            </div>
          )}

          {showCancelModal && (
            <div className="upgrade-modal-overlay" onClick={() => setShowCancelModal(false)}>
              <div className="upgrade-modal cancel-modal" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close btn btn-link" onClick={() => setShowCancelModal(false)} aria-label="Close">
                  <FiX size={18} />
                </button>
                <h3>Cancel Subscription?</h3>
                <div className="text-muted mb-3">
                  You will be moved to the Free plan immediately. You can switch back to a paid plan anytime.
                </div>
                <div className="modal-actions">
                  <button className="btn btn-outline-secondary" onClick={() => setShowCancelModal(false)}>Keep Plan</button>
                  <button className="btn btn-danger" onClick={confirmCancelSubscription}>Yes, Cancel</button>
                </div>
              </div>
            </div>
          )}

          <section className="plans-row">
            <div
              className={`plan card p-4 ${selectedPlan === 'free' ? 'popular highlighted' : ''}`}
              role="button"
              tabIndex={0}
              ref={freePlanRef}
              onClick={() => setSelectedPlan('free')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedPlan('free') }}
            >
              {currentPlan === 'free' && (
                <div className="popular-badge"> <FiCheck /> Current Plan</div>
              )}
              <div className="plan-icon"><FiStar size={28} /></div>
              <h4 className="plan-title">Free</h4>
              <p className="text-muted">Perfect for small teams getting started</p>
              <div className="plan-price mt-3">Free <div className="small-muted">Forever free</div></div>
              <div className="mt-3 text-center">
                <button
                  className="plan-cta btn btn-outline-secondary"
                  onClick={handleStartFree}
                  disabled={isFreePlan}
                >
                  {isFreePlan ? 'Current Plan' : 'Switch to Free'} <FiArrowRight className="ms-2"/>
                </button>
              </div>
              <hr className="plan-divider" />

              <ul className="plan-features mt-3">
                <li><FiCheck className="feature-check" />Up to 5 team members</li>
                <li><FiCheck className="feature-check" />3 projects</li>
                <li><FiCheck className="feature-check" />Basic Kanban board</li>
                <li><FiCheck className="feature-check" />Issue tracking</li>
                <li><FiCheck className="feature-check" />Mobile app access</li>
                <li><FiCheck className="feature-check" />1 GB storage</li>
                <li><FiCheck className="feature-check" />Community support</li>
                <li className="text-muted"><FiX className="feature-cross" />Advanced reporting</li>
                <li className="text-muted"><FiX className="feature-cross" />Custom workflows</li>
                <li className="text-muted"><FiX className="feature-cross" />Time tracking</li>
                <li className="text-muted"><FiX className="feature-cross" />Priority support</li>
                <li className="text-muted"><FiX className="feature-cross" />SSO / SAML</li>
              </ul>
            </div>

            <div
              className={`plan card p-4 ${selectedPlan === 'professional' ? 'popular highlighted' : ''}`}
              role="button"
              tabIndex={0}
              ref={professionalPlanRef}
              onClick={() => setSelectedPlan('professional')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedPlan('professional') }}
            >
              {currentPlan === 'professional' && (
                <div className="popular-badge"> <FiCheck /> Current Plan</div>
              )}
              <div className="plan-icon"><FiZap size={32} /></div>
              <h4 className="plan-title">Professional</h4>
              <p className="text-muted">For growing teams that need more power</p>
              <div className="plan-price mt-3">{period === 'monthly' ? '$12' : '$120'} <div className="small-muted">per user/{period === 'monthly' ? 'month' : 'year'}</div></div>
              {currentPlan === 'professional' ? (
                <div className="mt-3 text-center">
                  <button className="plan-cta btn btn-outline-secondary" disabled>Current Plan</button>
                </div>
              ) : professionalEntitlement ? (
                <div className="mt-3 text-center">
                  <button className="plan-cta btn btn-primary" onClick={() => handleSwitchToPlan('professional', professionalEntitlement)}>
                    Switch Plan <FiArrowRight className="ms-2"/>
                  </button>
                </div>
              ) : (
                <div className="mt-3 text-center">
                  <button className="plan-cta btn btn-primary" onClick={() => { setModalPlan('professional'); setShowUpgradeModal(true); }}>
                    Upgrade <FiArrowRight className="ms-2"/>
                  </button>
                </div>
              )}
              <hr className="plan-divider" />

              <ul className="plan-features mt-3">
                <li>Up to 50 team members <FiCheck className="feature-check" /></li>
                <li>Unlimited projects <FiCheck className="feature-check" /></li>
                <li>Advanced Kanban &amp; Scrum boards <FiCheck className="feature-check" /></li>
                <li>Issue tracking &amp; subtasks <FiCheck className="feature-check" /></li>
                <li>Mobile app access <FiCheck className="feature-check" /></li>
                <li>100 GB storage <FiCheck className="feature-check" /></li>
                <li>Advanced reporting &amp; analytics <FiCheck className="feature-check" /></li>
                <li>Custom workflows <FiCheck className="feature-check" /></li>
                <li>Time tracking <FiCheck className="feature-check" /></li>
                <li>Email &amp; chat support <FiCheck className="feature-check" /></li>
                <li>Sprint planning <FiCheck className="feature-check" /></li>
                <li className="text-muted"><FiX className="feature-cross" />SSO / SAML</li>
              </ul>
            </div>

            <div
              className={`plan card p-4 ${selectedPlan === 'business' ? 'popular highlighted' : ''}`}
              role="button"
              tabIndex={0}
              ref={businessPlanRef}
              onClick={() => setSelectedPlan('business')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedPlan('business') }}
            >
              {currentPlan === 'business' && (
                <div className="popular-badge"> <FiCheck /> Current Plan</div>
              )}
              <div className="plan-icon"><FiBriefcase size={32} /></div>
              <h4 className="plan-title">Business</h4>
              <p className="text-muted">Advanced features for large teams</p>
              <div className="plan-price mt-3">$25 <div className="small-muted">per user/month</div></div>
              {currentPlan === 'business' ? (
                <div className="mt-3 text-center">
                  <button className="plan-cta btn btn-outline-secondary" disabled>Current Plan</button>
                </div>
              ) : businessEntitlement ? (
                <div className="mt-3 text-center">
                  <button className="plan-cta btn btn-primary" onClick={() => handleSwitchToPlan('business', businessEntitlement)}>
                    Switch Plan <FiArrowRight className="ms-2"/>
                  </button>
                </div>
              ) : (
                <div className="mt-3 text-center">
                  <button className="plan-cta btn btn-primary" onClick={() => { setModalPlan('business'); setShowUpgradeModal(true); }}>
                    Upgrade <FiArrowRight className="ms-2"/>
                  </button>
                </div>
              )}
              <hr className="plan-divider" />

              <ul className="plan-features mt-3">
                <li>Up to 50 team members <FiCheck className="feature-check" /></li>
                <li>Unlimited projects <FiCheck className="feature-check" /></li>
                <li>Advanced Kanban &amp; Scrum boards <FiCheck className="feature-check" /></li>
                <li>Issue tracking &amp; subtasks <FiCheck className="feature-check" /></li>
                <li>Mobile app access <FiCheck className="feature-check" /></li>
                <li>500 GB storage <FiCheck className="feature-check" /></li>
                <li>Advanced reporting &amp; analytics <FiCheck className="feature-check" /></li>
                <li>Custom workflows <FiCheck className="feature-check" /></li>
                <li>Time tracking &amp; billing <FiCheck className="feature-check" /></li>
                <li>Priority support <FiCheck className="feature-check" /></li>
                <li>Sprint planning &amp; velocity <FiCheck className="feature-check" /></li>
                <li>Portfolio management <FiCheck className="feature-check" /></li>
                <li>Email &amp; chat support <FiCheck className="feature-check" /></li>
                <li>SSO / SAML <FiCheck className="feature-check" /></li>
                <li>Advanced permissions <FiCheck className="feature-check" /></li>
                <li>API access <FiCheck className="feature-check" /></li>
              </ul>
            </div>

            <div
              className={`plan card p-4 ${selectedPlan === 'enterprise' ? 'popular highlighted' : ''}`}
              role="button"
              tabIndex={0}
              ref={enterprisePlanRef}
              onClick={() => setSelectedPlan('enterprise')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedPlan('enterprise') }}
            >
              {currentPlan === 'enterprise' && (
                <div className="popular-badge"> <FiCheck /> Current Plan</div>
              )}
              <div className="plan-icon"><FiServer size={28} /></div>
              <h4 className="plan-title">Enterprise</h4>
              <p className="text-muted">Custom solutions for enterprises</p>
              <div className="plan-price mt-3">Custom <div className="small-muted">Contact sales</div></div>
              {currentPlan === 'enterprise' ? (
                <div className="mt-3 text-center">
                  <button className="plan-cta btn btn-outline-secondary" disabled>Current Plan</button>
                </div>
              ) : enterpriseEntitlement ? (
                <div className="mt-3 text-center">
                  <button className="plan-cta btn btn-primary" onClick={() => handleSwitchToPlan('enterprise', enterpriseEntitlement)}>
                    Switch Plan <FiArrowRight className="ms-2"/>
                  </button>
                </div>
              ) : (
                <div className="mt-3 text-center">
                  <button className="plan-cta btn btn-outline-primary" onClick={() => window.location.href = '/contact-sales'}>
                    Contact Sales <FiArrowRight className="ms-2"/>
                  </button>
                </div>
              )}
              <hr className="plan-divider" />

              <ul className="plan-features mt-3">
                <li>Unlimited team members <FiCheck className="feature-check" /></li>
                <li>Unlimited projects <FiCheck className="feature-check" /></li>
                <li>Advanced Kanban &amp; Scrum boards <FiCheck className="feature-check" /></li>
                <li>Issue tracking &amp; subtasks <FiCheck className="feature-check" /></li>
                <li>Mobile app access <FiCheck className="feature-check" /></li>
                <li>Unlimited storage <FiCheck className="feature-check" /></li>
                <li>Advanced reporting &amp; analytics <FiCheck className="feature-check" /></li>
                <li>Custom workflows <FiCheck className="feature-check" /></li>
                <li>Time tracking &amp; billing <FiCheck className="feature-check" /></li>
                <li>24/7 dedicated support <FiCheck className="feature-check" /></li>
                <li>Sprint planning &amp; velocity <FiCheck className="feature-check" /></li>
                <li>Portfolio management <FiCheck className="feature-check" /></li>
                <li>SSO / SAML <FiCheck className="feature-check" /></li>
                <li>Advanced permissions <FiCheck className="feature-check" /></li>
                <li>API access &amp; webhooks <FiCheck className="feature-check" /></li>
                <li>Custom integrations <FiCheck className="feature-check" /></li>
                <li>On-premise deployment <FiCheck className="feature-check" /></li>
                <li>Dedicated account manager <FiCheck className="feature-check" /></li>
                <li>SLA guarantee <FiCheck className="feature-check" /></li>
              </ul>
            </div>
          </section>

          

          <section className="subscription-details mt-4">
            <div className="subscription-card p-4">
              <h3>Current Subscription Details</h3>
              <div className="text-muted mb-3">Manage your organization's billing and subscription</div>

              <div className="sub-grid mb-3">
                <div className="sub-item">
                  <div className="sub-label">Organization</div>
                  <div className="d-flex align-items-center mt-2">
                    <div className="org-avatar">{selectedOrg?.name ? selectedOrg.name.charAt(0) : 'K'}</div>
                    <div className="ms-2 org-name">{selectedOrg?.name || 'Kavya Technologies'}</div>
                  </div>
                </div>

                <div className="sub-item">
                  <div className="sub-label">Current Plan</div>
                  <div className="sub-value mt-2"><strong>{formatPlanLabel(currentPlan)}</strong></div>
                </div>

                <div className="sub-item">
                  <div className="sub-label">Billing Cycle</div>
                  <div className="sub-value mt-2">{currentBillingCycle === 'monthly' ? 'Monthly' : 'Yearly'}</div>
                </div>
              </div>

              <div className="sub-metrics mb-3">
                <div className="metric">
                  <div className="metric-label">Team Members</div>
                  <div className="metric-value">4 / 50</div>
                  <div className="progress"><div className="progress-fill" style={{width: '8%'}}></div></div>
                </div>

                <div className="metric">
                  <div className="metric-label">Active Projects</div>
                  <div className="metric-value">3 / Unlimited</div>
                </div>

                <div className="metric">
                  <div className="metric-label">Storage Used</div>
                  <div className="metric-value">2.4 GB / 100 GB</div>
                  <div className="progress"><div className="progress-fill" style={{width: '2.4%'}}></div></div>
                </div>
              </div>

              <div className="sub-actions d-flex gap-2">
                <button className="btn btn-outline-secondary" onClick={() => navigate('/update-payment')}>Update Payment Method</button>
                <button className="btn btn-outline-secondary" onClick={() => navigate('/teams')}>Manage Team Members</button>
                <button className="btn btn-outline-primary" onClick={() => setShowSwitchModal(true)}>Switch Plan</button>
                {!isFreePlan && (
                  <button className="btn btn-danger" onClick={() => setShowCancelModal(true)}>Cancel Subscription</button>
                )}
              </div>
            </div>
          </section>

          <section className="billing-history mt-4">
            <div className="subscription-card p-4">
              <h3>Billing History</h3>
              <div className="text-muted mb-3">Your recent invoices and payments</div>

              <div className={`invoice-list ${invoiceListScrollable ? 'scrollable' : ''}`}>
                {paymentsLoading && (
                  <div className="text-muted">Loading billing history...</div>
                )}

                {!paymentsLoading && payments.length === 0 && (
                  <div className="text-muted">No payments yet.</div>
                )}

                {!paymentsLoading && payments.map((p) => {
                  const invoiceId = p.id || p.referenceId
                

  return (
                  <div className="invoice-row" key={p.id}>
                    <div className="invoice-left d-flex align-items-center">
                      <div className="invoice-icon"><FiCheck /></div>
                      <div className="invoice-text ms-3">
                        <div className="invoice-id">{p.referenceId || p.id}</div>
                        <div className="invoice-date text-muted">{formatPaymentDate(p.createdAt)} â€¢ {p.planName || 'Plan'}</div>
                      </div>
                    </div>
                    <div className="invoice-right d-flex align-items-center gap-3">
                      <div className="invoice-amount">{formatPaymentAmount(p.amount, p.currency)}</div>
                      <div className="invoice-status text-success">{p.status || 'Paid'}</div>
                      <button className="btn btn-link invoice-download" onClick={() => handleDownloadInvoice(invoiceId)}><FiDownload /> Download</button>
                    </div>
                  </div>
                )})}
              </div>
            </div>
          </section>

        </div>

          <footer className="page-footer mt-4">
          <div className="subscription-card p-4">
            <h3>Frequently Asked Questions</h3>
            <div className="text-muted mb-3"> </div>

            <div className="faq-accordion">
              {faqs.map((f, i) => (
                <div className={`faq-item mb-3 ${openFaq === i ? 'open' : 'collapsed'}`} key={i}>
                  <button className="faq-question d-flex align-items-center justify-content-between w-100" onClick={() => toggleFaq(i)} aria-expanded={openFaq === i}>
                    <span>{f.q}</span>
                    <FiChevronDown className={`faq-chevron ${openFaq === i ? 'rotated' : ''}`} />
                  </button>
                  <div className={`faq-answer text-muted ${openFaq === i ? 'show' : ''}`}>{f.a}</div>
                </div>
              ))}
            </div>
          </div>

            {/* CTA placed after FAQ (restored) */}
            <div className="help-cta text-center mt-4">
              <h2 className="cta-title">Need help choosing?</h2>
              <p className="cta-sub">Our team is here to help you find the perfect plan</p>
              <div className="cta-actions d-inline-flex align-items-center gap-3 mt-3">
                <button type="button" className="btn btn-dark cta-contact" onClick={() => navigate('/contact-sales')}>
                  Contact Sales <span className="cta-arrow">→</span>
                </button>
              </div>
            </div>

          </footer>

      </main>
    </div>
    
  )
}
  





