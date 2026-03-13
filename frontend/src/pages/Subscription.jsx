import { useNavigate, NavLink } from 'react-router-dom'
import './Subscription.css'
import './Dashboard.css'
import { FiSearch, FiBell, FiPlus, FiZap, FiStar, FiCheck, FiGrid, FiFolder, FiUsers, FiBarChart2, FiCreditCard, FiSettings, FiLogOut, FiMenu, FiUser, FiBriefcase, FiServer, FiDownload, FiArrowRight, FiChevronDown, FiX, FiRepeat } from 'react-icons/fi'
import { GiCrown } from 'react-icons/gi'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import useIssueNotifications from '../hooks/useIssueNotifications'

export default function Subscription() {
  const navigate = useNavigate()
  const { user, clearUser } = useAuth()
  const displayName = user?.name || (user?.email ? user.email.split('@')[0] : 'Guest')
  const [selectedOrg, setSelectedOrg] = useState(() => {
    try { return typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('org') || 'null') : null } catch (e) { return null }
  })
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [period, setPeriod] = useState('monthly')
  const [selectedPlan, setSelectedPlan] = useState('professional')
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [modalPlan, setModalPlan] = useState(null)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('card')
  const [upiCopied, setUpiCopied] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
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
              <div className="avatar-icon"><FiUser size={20} /></div>
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
                <div className="input-group top-search-medium">
                  <span className="input-group-text" role="button" aria-label="Open search" onClick={() => setMobileSearchOpen(true)}><FiSearch /></span>
                  <input className="form-control" placeholder="Search issues, projects..." aria-label="Search projects and issues" />
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

                <button className="btn create-issue-medium dark" onClick={() => navigate('/create-issue')}>
                  <FiPlus className="me-1" /> Create Issue
                </button>
              </div>

              <div className="text-center">
                <div className="current-plan-badge mb-2"> <GiCrown /> Current Plan: <strong>{selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)}</strong></div>
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
                  <span className="input-group-text"><FiSearch /></span>
                  <input autoFocus className="form-control" placeholder="Search issues, projects..." aria-label="Mobile search input" />
                  <button className="btn btn-link ms-2" aria-label="Close search" onClick={() => setMobileSearchOpen(false)}><FiX size={20} /></button>
                </div>
              </div>
            </div>
          )}

          {/* Upgrade modal */}
          {showUpgradeModal && (
            <div className="upgrade-modal-overlay" onClick={() => setShowUpgradeModal(false)}>
              <div className="upgrade-modal" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close btn btn-link" onClick={() => setShowUpgradeModal(false)}>×</button>
                <h3>Upgrade to {modalPlan ? modalPlan.charAt(0).toUpperCase() + modalPlan.slice(1) : ''} Plan</h3>
                <div className="modal-price">{modalPlan === 'professional' ? '$19' : modalPlan === 'business' ? '$25' : modalPlan === 'enterprise' ? 'Custom' : 'Free'} <span className="small-muted">/month</span></div>
                <ul className="modal-features">
                  <li>Full Access</li>
                  <li>Priority Support</li>
                  <li>Advanced Analytics</li>
                </ul>

                <div className="modal-payments">
                  <div className={`payment-option ${selectedPaymentMethod === 'card' ? 'selected' : ''}`} onClick={() => setSelectedPaymentMethod('card')}>Credit Card</div>
                  <div className={`payment-option ${selectedPaymentMethod === 'paypal' ? 'selected' : ''}`} onClick={() => setSelectedPaymentMethod('paypal')}>PayPal</div>
                  <div className={`payment-option ${selectedPaymentMethod === 'upi' ? 'selected' : ''}`} onClick={() => setSelectedPaymentMethod('upi')}>UPI</div>
                </div>

                {/* Small visual preview for selected payment */}
                <div className="payment-preview">
                  {selectedPaymentMethod === 'card' && (
                    <div className="card-preview">
                      <div className="card-chip" />
                      <div className="card-number">•••• 4242</div>
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
                  <button className="btn btn-warning" onClick={() => { setShowUpgradeModal(false); navigate('/payment', { state: { plan: modalPlan, paymentMethod: selectedPaymentMethod } }); }}>Confirm & Subscribe</button>
                  <button className="btn btn-outline-secondary" onClick={() => setShowUpgradeModal(false)}>Cancel</button>
                </div>
              </div>
            </div>
          )}

          <section className="plans-row">
            <div
              className={`plan card p-4 ${selectedPlan === 'free' ? 'popular highlighted' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedPlan('free')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedPlan('free') }}
            >
              {selectedPlan === 'free' && (
                <div className="popular-badge"> <FiCheck /> Current Plan</div>
              )}
              <div className="plan-icon"><FiStar size={28} /></div>
              <h4 className="plan-title">Free</h4>
              <p className="text-muted">Perfect for small teams getting started</p>
              <div className="plan-price mt-3">Free <div className="small-muted">Forever free</div></div>
                <div className="mt-3 text-center"><button className="plan-cta btn btn-outline-secondary" onClick={() => { setModalPlan('free'); setShowUpgradeModal(true); }}>Start Free <FiArrowRight className="ms-2"/></button></div>
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
                <li>SSO / SAML <FiCheck className="feature-check" /></li>
              </ul>
            </div>

            <div
              className={`plan card p-4 ${selectedPlan === 'professional' ? 'popular highlighted' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedPlan('professional')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedPlan('professional') }}
            >
              {selectedPlan === 'professional' && (
                <div className="popular-badge"> <FiCheck /> Current Plan</div>
              )}
              <div className="plan-icon"><FiZap size={32} /></div>
              <h4 className="plan-title">Professional</h4>
              <p className="text-muted">For growing teams that need more power</p>
              <div className="plan-price mt-3">{period === 'monthly' ? '$12' : '$120'} <div className="small-muted">per user/{period === 'monthly' ? 'month' : 'year'}</div></div>
              <div className="mt-3 text-center"><button className="plan-cta btn btn-primary" onClick={() => { setModalPlan('professional'); setShowUpgradeModal(true); }}>Upgrade <FiArrowRight className="ms-2"/></button></div>
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
                <li>SSO / SAML <FiCheck className="feature-check" /></li>
              </ul>
            </div>

            <div
              className={`plan card p-4 ${selectedPlan === 'business' ? 'popular highlighted' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedPlan('business')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedPlan('business') }}
            >
              {selectedPlan === 'business' && (
                <div className="popular-badge"> <FiCheck /> Current Plan</div>
              )}
              <div className="plan-icon"><FiBriefcase size={32} /></div>
              <h4 className="plan-title">Business</h4>
              <p className="text-muted">Advanced features for large teams</p>
              <div className="plan-price mt-3">$25 <div className="small-muted">per user/month</div></div>
              <div className="mt-3 text-center"><button className="plan-cta btn btn-primary" onClick={() => { setModalPlan('business'); setShowUpgradeModal(true); }}>Upgrade <FiArrowRight className="ms-2"/></button></div>
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
                <li>SSO / SAML <FiCheck className="feature-check" /></li>
              </ul>
            </div>

            <div
              className={`plan card p-4 ${selectedPlan === 'enterprise' ? 'popular highlighted' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedPlan('enterprise')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedPlan('enterprise') }}
            >
              {selectedPlan === 'enterprise' && (
                <div className="popular-badge"> <FiCheck /> Current Plan</div>
              )}
              <div className="plan-icon"><FiServer size={28} /></div>
              <h4 className="plan-title">Enterprise</h4>
              <p className="text-muted">Custom solutions for enterprises</p>
              <div className="plan-price mt-3">Custom <div className="small-muted">Contact sales</div></div>
              <div className="mt-3 text-center"><button className="plan-cta btn btn-outline-primary" onClick={() => window.location.href = '/contact-sales'}>Contact Sales <FiArrowRight className="ms-2"/></button></div>
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
                <li>SSO / SAML <FiCheck className="feature-check" /></li>
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
                  <div className="sub-value mt-2"><strong>{selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)}</strong></div>
                </div>

                <div className="sub-item">
                  <div className="sub-label">Billing Cycle</div>
                  <div className="sub-value mt-2">{period === 'monthly' ? 'Monthly' : 'Yearly'}</div>
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
                <button className="btn btn-outline-secondary">Update Payment Method</button>
                <button className="btn btn-outline-secondary">Manage Team Members</button>
                <button className="btn btn-danger">Cancel Subscription</button>
              </div>
            </div>
          </section>

          <section className="billing-history mt-4">
            <div className="subscription-card p-4">
              <h3>Billing History</h3>
              <div className="text-muted mb-3">Your recent invoices and payments</div>

              <div className="invoice-list">
                <div className="invoice-row">
                  <div className="invoice-left d-flex align-items-center">
                    <div className="invoice-icon"><FiCheck /></div>
                    <div className="invoice-text ms-3">
                      <div className="invoice-id">INV-2024-002</div>
                      <div className="invoice-date text-muted">February 1, 2024</div>
                    </div>
                  </div>
                  <div className="invoice-right d-flex align-items-center gap-3">
                    <div className="invoice-amount">$600</div>
                    <div className="invoice-status text-success">Paid</div>
                    <button className="btn btn-link invoice-download"><FiDownload /> Download</button>
                  </div>
                </div>

                <div className="invoice-row">
                  <div className="invoice-left d-flex align-items-center">
                    <div className="invoice-icon"><FiCheck /></div>
                    <div className="invoice-text ms-3">
                      <div className="invoice-id">INV-2024-001</div>
                      <div className="invoice-date text-muted">January 1, 2024</div>
                    </div>
                  </div>
                  <div className="invoice-right d-flex align-items-center gap-3">
                    <div className="invoice-amount">$600</div>
                    <div className="invoice-status text-success">Paid</div>
                    <button className="btn btn-link invoice-download"><FiDownload /> Download</button>
                  </div>
                </div>

                <div className="invoice-row">
                  <div className="invoice-left d-flex align-items-center">
                    <div className="invoice-icon"><FiCheck /></div>
                    <div className="invoice-text ms-3">
                      <div className="invoice-id">INV-2023-012</div>
                      <div className="invoice-date text-muted">December 1, 2023</div>
                    </div>
                  </div>
                  <div className="invoice-right d-flex align-items-center gap-3">
                    <div className="invoice-amount">$600</div>
                    <div className="invoice-status text-success">Paid</div>
                    <button className="btn btn-link invoice-download"><FiDownload /> Download</button>
                  </div>
                </div>
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
                <button className="btn btn-outline-light cta-schedule">Schedule a Demo</button>
                <button className="btn btn-dark cta-contact">Contact Sales <span className="cta-arrow">→</span></button>
              </div>
            </div>

          </footer>
      </main>
    </div>
    
  )
}
  
