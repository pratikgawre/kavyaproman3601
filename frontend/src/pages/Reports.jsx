import React, { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate, NavLink, useLocation } from "react-router-dom";
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
  FiTrendingUp,
  FiRepeat,
  FiArrowRight,
  FiTarget,
  FiClock,
  FiActivity,
  FiX,
} from "react-icons/fi";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

import "./Reports.css";
import "./Dashboard.css";
import { useAuth } from '../context/AuthContext'
import useIssueNotifications from '../hooks/useIssueNotifications'
import { getInitials } from '../utils/initials'

const normalizeRole = (role) => (role || "").trim().toLowerCase();

const Reports = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const API_BASE = (import.meta?.env?.VITE_API_BASE || "http://localhost:8080");
  const [activeTab, setActiveTab] = useState("velocity");
  const [isCompactViewport, setIsCompactViewport] = useState(
    () => typeof window !== "undefined" && window.innerWidth <= 768
  );
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [topSearchText, setTopSearchText] = useState("");

  const { user, clearUser } = useAuth()
  const displayName = user?.name || (user?.email ? user.email.split('@')[0] : 'Guest')
  const avatarInitials = getInitials(user?.name || displayName, user?.email)
  const isDeveloper = normalizeRole(user?.role) === 'developer'
  const [selectedOrg, setSelectedOrg] = useState(() => {
    try {
      return typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('org') || 'null') : null
    } catch { return null }
  })
  const avatar = user?.avatar || ''

  // listen for organization changes from OrganizationPage or other parts of app
  useEffect(() => {
    function onOrgChanged(e) {
      const org = e?.detail || null
      setSelectedOrg(org)
      try { if (org) localStorage.setItem('org', JSON.stringify(org)) }
      catch (err) { void err }
    }
    window.addEventListener('org:changed', onOrgChanged)
    return () => window.removeEventListener('org:changed', onOrgChanged)
  }, [])

  function handleLogout(){ clearUser(); navigate('/login', { replace:true }) }

  const projectKeyFrom = (projectItem) =>
    normalizeProjectKey(projectItem?.projectKey || projectItem?.id || "");
  const projectLabel = (projectItem) => {
    const key = projectKeyFrom(projectItem);
    const name = projectItem?.name || key || "Project";
    return key ? `${name} (${key})` : name;
  };

  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState("");
  const [selectedProjectKey, setSelectedProjectKey] = useState(() => {
    const fromState = normalizeProjectKey(
      location.state?.project?.projectKey ||
      location.state?.project?.id ||
      location.state?.project ||
      ""
    );
    if (fromState) return fromState;

    const fromQuery = normalizeProjectKey(new URLSearchParams(location.search || "").get("project") || "");
    if (fromQuery) return fromQuery;

    try {
      const stored = typeof window !== "undefined" ? (localStorage.getItem("reports:project") || "") : "";
      return normalizeProjectKey(stored);
    } catch (err) {
      void err;
      return "";
    }
  });

  useEffect(() => {
    const controller = new AbortController();
    let ignore = false;

    const email = (user?.email || "").trim();
    let query = "";
    if (email) {
      const key = isProjectManager ? "managerEmail" : "memberEmail";
      query = `?${key}=${encodeURIComponent(email)}`;
    }

    Promise.resolve()
      .then(() => {
        if (ignore) return;
        setProjectsLoading(true);
        setProjectsError("");
      })
      .then(() => fetch(`${API_BASE}/api/projects${query}`, { signal: controller.signal }))
      .then(async (res) => {
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(errorText || "Failed to load projects");
        }
        return res.json();
      })
      .then((data) => {
        if (ignore) return;
        setProjects(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (ignore) return;
        if (err.name === "AbortError") return;
        setProjects([]);
        setProjectsError(err.message || "Failed to load projects");
      })
      .finally(() => {
        if (ignore) return;
        setProjectsLoading(false);
      });

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [API_BASE, isProjectManager, user?.email]);

  const availableProjectKeys = useMemo(
    () => (projects || []).map(projectKeyFrom).filter(Boolean),
    [projects]
  );

  const activeProjectKey = useMemo(() => {
    const normalized = normalizeProjectKey(selectedProjectKey);
    if (normalized && availableProjectKeys.includes(normalized)) return normalized;
    return availableProjectKeys[0] || "";
  }, [availableProjectKeys, selectedProjectKey]);

  useEffect(() => {
    if (!activeProjectKey) return;
    try {
      localStorage.setItem("reports:project", activeProjectKey);
    } catch (err) { void err }
  }, [activeProjectKey]);

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

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const onResize = () => setIsCompactViewport(window.innerWidth <= 768);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const [issues, setIssues] = useState([]);
  const [issuesLoading, setIssuesLoading] = useState(false);
  const [issuesError, setIssuesError] = useState("");

  useEffect(() => {
    if (!activeProjectKey) return;

    const controller = new AbortController();
    let ignore = false;

    Promise.resolve()
      .then(() => {
        if (ignore) return;
        setIssuesLoading(true);
        setIssuesError("");
      })
      .then(() => fetch(`${API_BASE}/api/issues?project=${encodeURIComponent(activeProjectKey)}`, { signal: controller.signal }))
      .then(async (res) => {
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(errorText || "Failed to load issues");
        }
        return res.json();
      })
      .then((data) => {
        if (ignore) return;
        setIssues(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (ignore) return;
        if (err.name === "AbortError") return;
        setIssues([]);
        setIssuesError(err.message || "Failed to load issues");
      })
      .finally(() => {
        if (ignore) return;
        setIssuesLoading(false);
      });

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [API_BASE, activeProjectKey]);

  const visibleIssues = useMemo(() => {
    const list = activeProjectKey ? (issues || []) : [];
    if (isProjectManager || !userEmail) return list;
    return list.filter((issue) => {
      const assigneeEmail = (issue?.assigneeEmail || issue?.assignee || issue?.creatorEmail || "")
        .toString()
        .toLowerCase();
      return assigneeEmail && assigneeEmail === userEmail;
    });
  }, [activeProjectKey, issues, isProjectManager, userEmail]);

  const issuePoints = (issue) => {
    const points = Number(issue?.points);
    if (Number.isFinite(points)) return points;
    return pointsFromDifficulty(issue?.difficulty);
  };

  const totalIssues = (visibleIssues || []).length;
  const completedIssues = (visibleIssues || []).filter((i) => normalizeStatus(i.status) === "done").length;
  const completionRate = totalIssues > 0 ? Math.round((completedIssues / totalIssues) * 100) : 0;
  const totalPoints = (visibleIssues || []).reduce((sum, issue) => sum + issuePoints(issue), 0);
  const estimatedHours = totalPoints * HOURS_PER_POINT;
  const loggedHours = Math.round((visibleIssues || []).reduce((sum, issue) => {
    const estimate = issuePoints(issue) * HOURS_PER_POINT;
    const status = normalizeStatus(issue.status);
    if (status === "done") return sum + estimate;
    if (status === "review") return sum + estimate * 0.8;
    if (status === "progress") return sum + estimate * 0.5;
    return sum;
  }, 0));

  // ===== VELOCITY =====
  const velocityData = useMemo(() => {
    const now = new Date();
    const currentWeekStart = startOfWeek(now);
    const weeks = [];
    for (let offset = 5; offset >= 0; offset -= 1) {
      const weekStart = new Date(currentWeekStart);
      weekStart.setDate(weekStart.getDate() - offset * 7);
      weeks.push({
        key: dateKey(weekStart),
        label: formatShortDate(weekStart),
        points: 0,
      });
    }

    const byKey = new Map(weeks.map((w) => [w.key, w]));
    (visibleIssues || []).forEach((issue) => {
      if (normalizeStatus(issue.status) !== "done") return;
      const completionDate = parseBackendDate(issue.updatedAt) || parseBackendDate(issue.createdAt);
      if (!completionDate) return;
      const weekStart = startOfWeek(completionDate);
      const key = dateKey(weekStart);
      const bucket = byKey.get(key);
      if (!bucket) return;
      bucket.points += issuePoints(issue);
    });

    return weeks.map((w) => ({ period: w.label, points: w.points }));
  }, [visibleIssues]);

  const burndownData = useMemo(() => {
    const rangeDays = 7;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = [];
    for (let offset = rangeDays - 1; offset >= 0; offset -= 1) {
      const dayStart = new Date(today);
      dayStart.setDate(dayStart.getDate() - offset);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);
      days.push({ label: formatShortDate(dayStart), end: dayEnd, remaining: 0 });
    }

    const all = visibleIssues || [];
    days.forEach((day) => {
      let remaining = 0;
      all.forEach((issue) => {
        const created = parseBackendDate(issue.createdAt) || parseBackendDate(issue.updatedAt);
        if (created && created > day.end) return;

        const points = issuePoints(issue);
        const status = normalizeStatus(issue.status);
        if (status !== "done") {
          remaining += points;
          return;
        }

        const completedAt = parseBackendDate(issue.updatedAt) || created;
        if (!completedAt || completedAt > day.end) {
          remaining += points;
        }
      });
      day.remaining = remaining;
    });

    return days.map((d) => ({ day: d.label, remaining: d.remaining }));
  }, [visibleIssues]);

  const issueTypeDistributionData = useMemo(() => {
    const counts = new Map();
    (visibleIssues || []).forEach((issue) => {
      const raw = (issue.issueType || issue.type || "Task").toString().trim();
      const normalized = raw ? raw.toLowerCase() : "task";
      const label = normalized.charAt(0).toUpperCase() + normalized.slice(1);
      counts.set(label, (counts.get(label) || 0) + 1);
    });

    const preferred = ["Story", "Task", "Bug", "Epic"];
    const ordered = [];
    preferred.forEach((label) => {
      const value = counts.get(label);
      if (value) ordered.push([label, value]);
      counts.delete(label);
    });
    const rest = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
    return [...ordered, ...rest].map(([type, value]) => ({ type, value }));
  }, [visibleIssues]);

  const statusDistributionData = useMemo(() => {
    const buckets = {
      todo: 0,
      progress: 0,
      review: 0,
      done: 0,
    };
    (visibleIssues || []).forEach((issue) => {
      const key = normalizeStatus(issue.status);
      buckets[key] = (buckets[key] || 0) + 1;
    });
    return [
      { status: "To Do", value: buckets.todo },
      { status: "In Progress", value: buckets.progress },
      { status: "In Review", value: buckets.review },
      { status: "Done", value: buckets.done },
    ];
  }, [visibleIssues]);
  // Notifications state for topbar
  const [showNotifications, setShowNotifications] = useState(false);
  const {
    notifications,
    unreadCount,
    loading: notificationsLoading,
    error: notificationsError,
    markAsRead: markNotificationAsRead,
    markAllAsRead,
    dismissNotification,
    clearAllNotifications
  } = useIssueNotifications({ limit: 6 });
  const notificationRef = useRef(null);
  const topSearchInputRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!mobileSearchOpen) return;
    const timeoutId = setTimeout(() => topSearchInputRef.current?.focus(), 0);
    return () => clearTimeout(timeoutId);
  }, [mobileSearchOpen]);

  const toggleSidebarForScreen = () => {
    setCollapsed(prev => {
      const next = !prev;
      if (typeof window !== "undefined" && window.innerWidth < 992) {
        setMobileOpen(!next);
      }
      return next;
    });
  };

  const isMobileScreen = () => typeof window !== "undefined" && window.innerWidth <= 768;

  const runIssueSearch = () => {
    const query = (topSearchText || "").trim();
    if (!query) {
      navigate("/all-my-issues");
      return;
    }
    navigate(`/all-my-issues?q=${encodeURIComponent(query)}`);
  };

  const handleTopSearchIconClick = (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (isMobileScreen() && !mobileSearchOpen) {
      setMobileSearchOpen(true);
      return;
    }

    runIssueSearch();
  };

  return (
    <div className="dashboard-root d-flex">

      {/* ===== SIDEBAR SAME AS BEFORE ===== */}
      <aside className={`sidebar d-flex flex-column ${collapsed ? "collapsed" : ""} ${mobileOpen ? "open" : ""}`}>
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

      <button className="mobile-toggle btn btn-sm" onClick={toggleSidebarForScreen} aria-label="Toggle sidebar" type="button">
        <FiMenu size={18} />
      </button>

      <div className={`mobile-overlay ${mobileOpen ? "show" : ""}`} onClick={() => { setMobileOpen(false); setCollapsed(true); }} />

      {/* ===== MAIN CONTENT ===== */}
      <main className="content flex-grow-1 p-4 reports-main">

        {/* ===== TOP SEARCH ===== */}
        <div className={`top-search-row mb-4 ${mobileSearchOpen ? "mobile-search-open" : ""}`}>
          <div
            className={`input-group top-search-medium ${mobileSearchOpen ? "mobile-open" : ""}`}
            onClick={() => {
              if (isMobileScreen() && !mobileSearchOpen) {
                setMobileSearchOpen(true);
                return;
              }
              topSearchInputRef.current?.focus();
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
                if (event.key === "Enter") runIssueSearch();
              }}
              onFocus={() => {
                if (isMobileScreen()) setMobileSearchOpen(true);
              }}
            />
            {mobileSearchOpen && (
              <button
                type="button"
                className="reports-search-close"
                aria-label="Close search"
                onClick={(event) => {
                  event.stopPropagation();
                  setMobileSearchOpen(false);
                }}
              >
                <FiX size={16} />
              </button>
            )}
          </div>

          <div className="notification-wrapper me-2" ref={notificationRef}>
            <button
              className="btn btn-link bell-black"
              onClick={() => setShowNotifications(prev => !prev)}
              aria-label="Toggle notifications"
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
                        <button className="mark-all-btn" onClick={markAllAsRead} type="button">
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
                    <div className="muted p-3">{notificationsError || "No notifications yet"}</div>
                  )}
                  {!notificationsLoading && notifications.length > 0 && notifications.map(item => (
                    <div
                      key={item.id}
                      className={`notification-item-row ${item.read ? "" : "unread"}`.trim()}
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

          {!isDeveloper && (
            <button className="btn create-issue-medium" onClick={() => navigate("/create-issue")}>
              <FiPlus /> Create Issue
            </button>
          )}
        </div>

        {/* ===== HEADER + DROPDOWN ===== */}
        <div className="reports-header">
          <div>
            <h1>Reports & Analytics</h1>
            <p className="text-muted">Track project progress and team performance</p>
          </div>

          <select
            className="project-dropdown"
            value={activeProjectKey}
            onChange={(e) => setSelectedProjectKey(normalizeProjectKey(e.target.value))}
            disabled={projectsLoading || projects.length === 0}
          >
            {projectsLoading && <option value="">Loading projects...</option>}
            {!projectsLoading && projects.length === 0 && <option value="">No projects</option>}
            {!projectsLoading && projects.length > 0 && projects.map((p) => {
              const key = projectKeyFrom(p);
              return (
                <option key={key} value={key}>
                  {projectLabel(p)}
                </option>
              );
            })}
          </select>
        </div>

        {(projectsError || issuesError) && (
          <p className="text-danger mt-2 mb-0">
            {projectsError || issuesError}
          </p>
        )}
        {(projectsLoading || issuesLoading) && (
          <p className="text-muted mt-2 mb-0">
            {projectsLoading ? "Loading projects..." : "Loading report data..."}
          </p>
        )}

        {/* ===== SUMMARY CARDS WITH ICONS ===== */}
        <div className="reports-cards">

          <div className="report-card">
            <div className="report-card-top">
              <h4>Total Issues</h4>
              <FiActivity className="card-icon blue-icon" />
            </div>
            <h2>{totalIssues}</h2>
            <p className="card-subtext">Across all statuses</p>
          </div>

          <div className="report-card">
            <div className="report-card-top">
              <h4>Completion Rate</h4>
              <FiTarget className="card-icon green-icon" />
            </div>
            <h2>{completionRate}%</h2>
            <p className="card-subtext">{completedIssues} of {totalIssues} completed</p>
          </div>

          <div className="report-card">
            <div className="report-card-top">
              <h4>Estimated Hours</h4>
              <FiClock className="card-icon purple-icon" />
            </div>
            <h2>{estimatedHours}h</h2>
            <p className="card-subtext">Total estimated time</p>
          </div>

          <div className="report-card">
            <div className="report-card-top">
              <h4>Logged Hours</h4>
              <FiTrendingUp className="card-icon orange-icon" />
            </div>
            <h2>{loggedHours}h</h2>
            <p className="card-subtext">Actual time logged</p>
          </div>

        </div>

        {/* ===== TABS ===== */}
        <div className="report-tabs mt-4">
          <button className={activeTab === "velocity" ? "active-tab" : ""} onClick={() => setActiveTab("velocity")}>Velocity</button>
          <button className={activeTab === "burndown" ? "active-tab" : ""} onClick={() => setActiveTab("burndown")}>Burndown</button>
          <button className={activeTab === "distribution" ? "active-tab" : ""} onClick={() => setActiveTab("distribution")}>Distribution</button>
        </div>

        {/* ===== TAB CONTENT ===== */}
        <div className="reports-chart mt-4">

          {activeTab === "velocity" && (
            <>
              <div className="chart-panel-header">
                <h3 className="chart-panel-title">Sprint Velocity</h3>
                <p className="chart-panel-subtitle">Story points completed per sprint</p>
              </div>
              <ResponsiveContainer width="100%" height={isCompactViewport ? 240 : 300}>
                <BarChart data={velocityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" tick={{ fontSize: isCompactViewport ? 11 : 12 }} />
                  <YAxis width={isCompactViewport ? 30 : 44} />
                  <Tooltip />
                  <Bar dataKey="points" fill="#0969da" />
                </BarChart>
              </ResponsiveContainer>
            </>
          )}

          {activeTab === "burndown" && (
            <>
              <div className="chart-panel-header">
                <h3 className="chart-panel-title">Sprint Burndown</h3>
                <p className="chart-panel-subtitle">Remaining story points over the last 7 days</p>
              </div>
              <ResponsiveContainer width="100%" height={isCompactViewport ? 240 : 300}>
                <LineChart data={burndownData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fontSize: isCompactViewport ? 11 : 12 }} />
                  <YAxis width={isCompactViewport ? 30 : 44} />
                  <Tooltip />
                  <Line type="monotone" dataKey="remaining" stroke="#2da44e" />
                </LineChart>
              </ResponsiveContainer>
            </>
          )}

          {activeTab === "distribution" && (
  <div className="distribution-grid">

    {/* ===== Issue Type Distribution ===== */}
    <div className="distribution-card">
      <h4>Issue Type Distribution</h4>
      <p className="text-muted">Breakdown by issue type</p>

      <ResponsiveContainer width="100%" height={isCompactViewport ? 220 : 250}>
        <BarChart
          data={issueTypeDistributionData}
          margin={isCompactViewport ? { top: 8, right: 8, left: -16, bottom: 8 } : undefined}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="type" tick={{ fontSize: isCompactViewport ? 11 : 12 }} />
          <YAxis width={isCompactViewport ? 30 : 44} />
          <Tooltip />
          <Bar dataKey="value" fill="#8250df" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>

    {/* ===== Status Distribution ===== */}
    <div className="distribution-card">
      <h4>Status Distribution</h4>
      <p className="text-muted">Issues by workflow status</p>

      <ResponsiveContainer width="100%" height={isCompactViewport ? 220 : 250}>
        <BarChart
          data={statusDistributionData}
          margin={isCompactViewport ? { top: 8, right: 8, left: -16, bottom: 20 } : undefined}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="status"
            interval={0}
            tick={{ fontSize: isCompactViewport ? 10 : 12 }}
            angle={isCompactViewport ? -18 : 0}
            textAnchor={isCompactViewport ? "end" : "middle"}
            height={isCompactViewport ? 52 : 30}
          />
          <YAxis width={isCompactViewport ? 30 : 44} />
          <Tooltip />
          <Bar dataKey="value" fill="#2da44e" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>

  </div>
)}
         </div>  {/* reports-chart */}
      </main>
    </div>
  );
};
    

export default Reports;
