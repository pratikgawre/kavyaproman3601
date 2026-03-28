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
const normalizeProjectKey = (value) => (value || "").toString().trim().toUpperCase();
const normalizeEmail = (value) => {
  const normalized = (value || "").toString().trim().toLowerCase();
  return normalized || "";
};
const EMPTY_ISSUES = Object.freeze([]);
const EMPTY_REPORT_DATA = Object.freeze({
  summary: {
    totalIssues: 0,
    completedIssues: 0,
    completionRate: 0,
    totalPoints: 0,
    estimatedHours: 0,
    loggedHours: 0,
  },
  velocityData: [],
  burndownData: [],
  issueTypeDistributionData: [],
  statusDistributionData: [],
});
const HOURS_PER_POINT = 8;
const VELOCITY_WEEKS = 6;
const BURNDOWN_DAYS = 7;
const ALL_PROJECTS_KEY = "__ALL__";

const formatShortDate = (date) =>
  date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

const startOfWeek = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
};

const parseIssueDate = (...values) => {
  for (const value of values) {
    if (!value) continue;
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return null;
};

const normalizeStatus = (value) => {
  const normalized = (value || "").toString().trim().toLowerCase();
  if (["progress", "in-progress", "in progress"].includes(normalized)) return "progress";
  if (["review", "in-review", "in review"].includes(normalized)) return "review";
  if (["done", "completed"].includes(normalized)) return "done";
  return "todo";
};

const normalizeIssueType = (value) => {
  const normalized = (value || "").toString().trim().toLowerCase();
  return normalized || "task";
};

const capitalize = (value) => {
  const text = (value || "").toString().trim();
  if (!text) return "Task";
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const issuePoints = (issue) => {
  const explicitPoints = Number(issue?.points);
  if (Number.isFinite(explicitPoints) && explicitPoints > 0) {
    return explicitPoints;
  }

  const normalizedDifficulty = (issue?.difficulty || "").toString().trim().toLowerCase();
  if (normalizedDifficulty === "high") return 8;
  if (normalizedDifficulty === "low") return 2;
  return 5;
};

const isIssueVisibleToUser = (issue, userEmail, role, hasTeamScope, isTesterInProject) => {
  if (hasTeamScope || !userEmail) return true;

  const normalizedRole = normalizeRole(role);
  const candidates = [
    issue?.assigneeEmail,
    issue?.assignee,
    issue?.creatorEmail,
  ].map(normalizeEmail).filter(Boolean);
  const isAssigned = candidates.includes(userEmail);

  if (normalizedRole === "tester") {
    const reviewerEmail = normalizeEmail(issue?.reviewerEmail);
    if (reviewerEmail && reviewerEmail === userEmail) return true;
    if (isAssigned) return true;
    if (isTesterInProject && normalizeStatus(issue?.status) === "review") return true;
    return false;
  }

  return isAssigned;
};

const buildReportDataFromIssues = (issues) => {
  const issueList = Array.isArray(issues) ? issues : [];
  const totalIssues = issueList.length;

  let completedIssues = 0;
  let totalPoints = 0;
  let loggedHours = 0;

  for (const issue of issueList) {
    const points = issuePoints(issue);
    const status = normalizeStatus(issue?.status);
    totalPoints += points;

    if (status === "done") {
      completedIssues += 1;
      loggedHours += points * HOURS_PER_POINT;
    } else if (status === "review") {
      loggedHours += points * HOURS_PER_POINT * 0.8;
    } else if (status === "progress") {
      loggedHours += points * HOURS_PER_POINT * 0.5;
    }
  }

  const currentWeekStart = startOfWeek(new Date());
  const velocityBuckets = new Map();
  for (let offset = VELOCITY_WEEKS - 1; offset >= 0; offset -= 1) {
    const bucketDate = new Date(currentWeekStart);
    bucketDate.setDate(bucketDate.getDate() - (offset * 7));
    velocityBuckets.set(bucketDate.toISOString(), {
      period: formatShortDate(bucketDate),
      points: 0,
    });
  }

  for (const issue of issueList) {
    if (normalizeStatus(issue?.status) !== "done") continue;
    const completionDate = parseIssueDate(issue?.updatedAt, issue?.createdAt);
    const bucketDate = startOfWeek(completionDate);
    if (!bucketDate) continue;
    const key = bucketDate.toISOString();
    const bucket = velocityBuckets.get(key);
    if (bucket) {
      bucket.points += issuePoints(issue);
    }
  }

  const burndownData = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let offset = BURNDOWN_DAYS - 1; offset >= 0; offset -= 1) {
    const day = new Date(today);
    day.setDate(day.getDate() - offset);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);

    let remaining = 0;
    for (const issue of issueList) {
      const createdAt = parseIssueDate(issue?.createdAt, issue?.updatedAt);
      if (createdAt && createdAt > dayEnd) continue;

      const points = issuePoints(issue);
      if (normalizeStatus(issue?.status) !== "done") {
        remaining += points;
        continue;
      }

      const completedAt = parseIssueDate(issue?.updatedAt, issue?.createdAt);
      if (!completedAt || completedAt > dayEnd) {
        remaining += points;
      }
    }

    burndownData.push({
      day: formatShortDate(day),
      remaining,
    });
  }

  const issueTypeCounts = new Map();
  for (const issue of issueList) {
    const label = capitalize(normalizeIssueType(issue?.issueType));
    issueTypeCounts.set(label, (issueTypeCounts.get(label) || 0) + 1);
  }

  const issueTypeDistributionData = [];
  const preferredTypes = ["Story", "Task", "Bug", "Epic"];
  for (const label of preferredTypes) {
    if (!issueTypeCounts.has(label)) continue;
    issueTypeDistributionData.push({ type: label, value: issueTypeCounts.get(label) });
    issueTypeCounts.delete(label);
  }

  [...issueTypeCounts.entries()]
    .sort((left, right) => {
      if (right[1] !== left[1]) return right[1] - left[1];
      return left[0].localeCompare(right[0]);
    })
    .forEach(([type, value]) => {
      issueTypeDistributionData.push({ type, value });
    });

  const statusCounts = {
    todo: 0,
    progress: 0,
    review: 0,
    done: 0,
  };

  for (const issue of issueList) {
    const status = normalizeStatus(issue?.status);
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  }

  return {
    summary: {
      totalIssues,
      completedIssues,
      completionRate: totalIssues > 0 ? Math.round((completedIssues * 100) / totalIssues) : 0,
      totalPoints,
      estimatedHours: totalPoints * HOURS_PER_POINT,
      loggedHours: Math.round(loggedHours),
    },
    velocityData: [...velocityBuckets.values()],
    burndownData,
    issueTypeDistributionData,
    statusDistributionData: [
      { status: "To Do", value: statusCounts.todo || 0 },
      { status: "In Progress", value: statusCounts.progress || 0 },
      { status: "In Review", value: statusCounts.review || 0 },
      { status: "Done", value: statusCounts.done || 0 },
    ],
  };
};

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
  const userEmail = (user?.email || "").trim().toLowerCase();
  const normalizedRole = normalizeRole(user?.role)
  const isAdmin = normalizedRole === "admin";
  const isProjectManager = ["admin", "project manager"].includes(normalizedRole);
  const isDeveloper = normalizedRole === 'developer'
  const isTester = normalizedRole === 'tester'
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

    return ALL_PROJECTS_KEY;
  });

  useEffect(() => {
    const controller = new AbortController();
    let ignore = false;

    const email = (user?.email || "").trim();
    const queryParams = new URLSearchParams();
    if (email && !isAdmin) {
      const key = isProjectManager ? "managerEmail" : "memberEmail";
      queryParams.set(key, email);
    }
    const organizationId = selectedOrg?.id || selectedOrg?._id || "";
    const organizationUsername = selectedOrg?.username || selectedOrg?.slug || "";
    const organizationName = selectedOrg?.name || "";
    if (organizationId) {
      queryParams.set("organizationId", organizationId);
    } else if (organizationUsername) {
      queryParams.set("organizationUsername", organizationUsername);
    } else if (organizationName) {
      queryParams.set("organizationName", organizationName);
    }

    Promise.resolve()
      .then(() => {
        if (ignore) return;
        setProjectsLoading(true);
        setProjectsError("");
      })
      .then(() => {
        const query = queryParams.toString();
        return fetch(`${API_BASE}/api/projects${query ? `?${query}` : ""}`, { signal: controller.signal });
      })
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
  }, [
    API_BASE,
    isAdmin,
    isProjectManager,
    selectedOrg?.id,
    selectedOrg?._id,
    selectedOrg?.name,
    selectedOrg?.slug,
    selectedOrg?.username,
    user?.email,
  ]);

  const availableProjectKeys = useMemo(
    () => (projects || []).map(projectKeyFrom).filter(Boolean),
    [projects]
  );
  const availableProjectKeySet = useMemo(
    () => new Set(availableProjectKeys),
    [availableProjectKeys]
  );

  const activeProjectKey = useMemo(() => {
    const normalized = normalizeProjectKey(selectedProjectKey);
    if (normalized === ALL_PROJECTS_KEY) return ALL_PROJECTS_KEY;
    if (normalized && availableProjectKeys.includes(normalized)) return normalized;
    return ALL_PROJECTS_KEY;
  }, [availableProjectKeys, selectedProjectKey]);

  const projectsWithTeamMembers = useMemo(() => {
    const set = new Set();
    (projects || []).forEach((project) => {
      const key = projectKeyFrom(project);
      if (!key) return;
      const members = Array.isArray(project?.teamMembers) ? project.teamMembers : [];
      if (members.length > 0) set.add(key);
    });
    return set;
  }, [projects]);
  const testerProjectKeys = useMemo(() => {
    const set = new Set();
    if (!isTester) return set;
    (projects || []).forEach((project) => {
      const key = projectKeyFrom(project);
      if (!key) return;
      const members = Array.isArray(project?.teamMembers) ? project.teamMembers : [];
      members.forEach((member) => {
        const email = normalizeEmail(member?.email);
        if (email && email === userEmail) set.add(key);
      });
    });
    return set;
  }, [isTester, projects, userEmail]);
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

  const [projectIssues, setProjectIssues] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState("");
  const reportIssueSource = useMemo(
    () => (
      activeProjectKey && !(activeProjectKey === ALL_PROJECTS_KEY && availableProjectKeySet.size === 0)
        ? projectIssues
        : EMPTY_ISSUES
    ),
    [activeProjectKey, availableProjectKeySet.size, projectIssues]
  );
  const effectiveReportLoading = Boolean(reportIssueSource === projectIssues && reportLoading);
  const effectiveReportError = reportIssueSource === projectIssues ? reportError : "";

  useEffect(() => {
    if (!activeProjectKey || (activeProjectKey === ALL_PROJECTS_KEY && availableProjectKeySet.size === 0)) {
      return undefined;
    }

    const controller = new AbortController();
    let ignore = false;
    const isTesterInProjectKey = (projectKey) => {
      if (!isTester) return false;
      const normalizedKey = normalizeProjectKey(projectKey);
      if (!normalizedKey || normalizedKey === ALL_PROJECTS_KEY) return false;
      if (!projectsWithTeamMembers.has(normalizedKey)) return Boolean(userEmail);
      return testerProjectKeys.has(normalizedKey);
    };
    const queryParams = new URLSearchParams();
    if (activeProjectKey !== ALL_PROJECTS_KEY) {
      queryParams.set("project", activeProjectKey);
    }
    if (userEmail) queryParams.set("userEmail", userEmail);
    if (user?.role) queryParams.set("role", user.role);

    Promise.resolve()
      .then(() => {
        if (ignore) return;
        setReportLoading(true);
        setReportError("");
      })
      .then(() =>
        fetch(`${API_BASE}/api/issues?${queryParams.toString()}`, {
          signal: controller.signal,
          headers: user?.id ? { "X-USER-ID": String(user.id) } : undefined,
        })
      )
      .then(async (res) => {
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(errorText || "Failed to load issue data");
        }
        return res.json();
      })
      .then((data) => {
        if (ignore) return;
        const issuesArray = Array.isArray(data)
          ? data
          : (Array.isArray(data?.issues) ? data.issues : (Array.isArray(data?.data) ? data.data : []));

        const visibleIssues = issuesArray.filter((issue) => {
          const projectKey = normalizeProjectKey(issue?.project);
          const matchesProject = activeProjectKey === ALL_PROJECTS_KEY
            ? availableProjectKeySet.has(projectKey)
            : projectKey === activeProjectKey;
          if (!matchesProject) return false;
          const testerInProject = isTesterInProjectKey(projectKey);
          const hasTeamScopeForIssue = isProjectManager || (isTester && testerInProject);
          return isIssueVisibleToUser(issue, userEmail, user?.role, hasTeamScopeForIssue, testerInProject);
        });

        setProjectIssues(visibleIssues);
      })
      .catch((err) => {
        if (ignore) return;
        if (err.name === "AbortError") return;
        setProjectIssues([]);
        setReportError(err.message || "Failed to load issue data");
      })
      .finally(() => {
        if (ignore) return;
        setReportLoading(false);
      });

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [
    API_BASE,
    activeProjectKey,
    availableProjectKeySet,
    isProjectManager,
    isTester,
    projectsWithTeamMembers,
    testerProjectKeys,
    user?.id,
    user?.role,
    userEmail
  ]);

  const reportData = useMemo(
    () => buildReportDataFromIssues(reportIssueSource),
    [reportIssueSource]
  );

  const summary = reportData?.summary || EMPTY_REPORT_DATA.summary;
  const totalIssues = Number(summary.totalIssues) || 0;
  const completedIssues = Number(summary.completedIssues) || 0;
  const completionRate = Number(summary.completionRate) || 0;
  const estimatedHours = Number(summary.estimatedHours) || 0;
  const loggedHours = Number(summary.loggedHours) || 0;
  const velocityData = Array.isArray(reportData?.velocityData) ? reportData.velocityData : EMPTY_REPORT_DATA.velocityData;
  const burndownData = Array.isArray(reportData?.burndownData) ? reportData.burndownData : EMPTY_REPORT_DATA.burndownData;
  const issueTypeDistributionData = Array.isArray(reportData?.issueTypeDistributionData)
    ? reportData.issueTypeDistributionData
    : EMPTY_REPORT_DATA.issueTypeDistributionData;
  const statusDistributionData = Array.isArray(reportData?.statusDistributionData)
    ? reportData.statusDistributionData
    : EMPTY_REPORT_DATA.statusDistributionData;
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
            <option value={ALL_PROJECTS_KEY}>All Projects</option>
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

        {(projectsError || effectiveReportError) && (
          <p className="text-danger mt-2 mb-0">
            {projectsError || effectiveReportError}
          </p>
        )}
        {(projectsLoading || effectiveReportLoading) && (
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
