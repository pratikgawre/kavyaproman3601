import React, { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate, NavLink } from "react-router-dom";
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
  FiUser,
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

const Reports = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("velocity");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [topSearchText, setTopSearchText] = useState("");
  const [selectedProject, setSelectedProject] = useState("KavyaProMan 360");

  const { user, clearUser } = useAuth()
  const displayName = user?.name || (user?.email ? user.email.split('@')[0] : 'Guest')
  const [selectedOrg, setSelectedOrg] = useState(() => {
    try {
      return typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('org') || 'null') : null
    } catch (e) { return null }
  })
  const [avatar, setAvatar] = useState('')
  useEffect(() => { const stored = localStorage.getItem('userAvatar'); if (stored) setAvatar(stored) }, [])

  // listen for organization changes from OrganizationPage or other parts of app
  useEffect(() => {
    function onOrgChanged(e) {
      const org = e?.detail || null
      setSelectedOrg(org)
      try { if (org) localStorage.setItem('org', JSON.stringify(org)) }
      catch (err) {}
    }
    window.addEventListener('org:changed', onOrgChanged)
    return () => window.removeEventListener('org:changed', onOrgChanged)
  }, [])

  function handleLogout(){ clearUser(); navigate('/login', { replace:true }) }

  const projects = [
    "KavyaProMan 360",
    "Website Redesign",
    "Mobile App",
  ];

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

  // ===== SAMPLE DATA =====
  const issues = [
    { id: 1, status: "Completed", estimated: 10, logged: 8, sprint: "Sprint 1" },
    { id: 2, status: "In Progress", estimated: 12, logged: 6, sprint: "Sprint 1" },
    { id: 3, status: "Completed", estimated: 8, logged: 8, sprint: "Sprint 2" },
    { id: 4, status: "To Do", estimated: 15, logged: 0, sprint: "Sprint 2" },
    { id: 5, status: "Completed", estimated: 20, logged: 18, sprint: "Sprint 3" },
  ];

  const totalIssues = issues.length;
  const completedIssues = issues.filter(i => i.status === "Completed").length;
  const completionRate = Math.round((completedIssues / totalIssues) * 100);
  const totalEstimated = issues.reduce((s, i) => s + i.estimated, 0);
  const totalLogged = issues.reduce((s, i) => s + i.logged, 0);

  // ===== VELOCITY =====
  const velocityData = useMemo(() => {
    const sprintMap = {};
    issues.forEach(issue => {
      if (issue.status === "Completed") {
        sprintMap[issue.sprint] =
          (sprintMap[issue.sprint] || 0) + issue.estimated;
      }
    });

    return Object.keys(sprintMap).map(sprint => ({
      sprint,
      points: sprintMap[sprint],
    }));
  }, [issues]);

  const burndownData = [
    { day: "Day 1", remaining: 50 },
    { day: "Day 2", remaining: 40 },
    { day: "Day 3", remaining: 30 },
    { day: "Day 4", remaining: 15 },
    { day: "Day 5", remaining: 5 },
  ];

  const distributionData = [
    { name: "To Do", value: issues.filter(i => i.status === "To Do").length },
    { name: "In Progress", value: issues.filter(i => i.status === "In Progress").length },
    { name: "Completed", value: completedIssues },
  ];

  const COLORS = ["#f4b400", "#0969da", "#2da44e"];
  // Notifications state for topbar
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'New report generated: Sprint 5', time: '5m ago', read: false },
    { id: 2, title: 'Project plan updated', time: '25m ago', read: false },
    { id: 3, title: 'Export complete', time: '1h ago', read: true }
  ]);
  const notificationRef = useRef(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(item => ({ ...item, read: true })));
  };

  const markNotificationAsRead = (id) => {
    setNotifications(prev =>
      prev.map(item => (item.id === id ? { ...item, read: true } : item))
    );
  };

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

  return (
    <div className="dashboard-root d-flex">

      {/* ===== SIDEBAR SAME AS BEFORE ===== */}
      <aside className={`sidebar d-flex flex-column ${collapsed ? "collapsed" : ""} ${mobileOpen ? "open" : ""}`}>
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
              <div className="avatar-icon">{avatar ? <img src={avatar} alt="avatar" /> : <FiUser size={20} />}</div>
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
      <main className="content flex-grow-1 p-4">

        {/* ===== TOP SEARCH ===== */}
        <div className={`top-search-row mb-4 ${mobileSearchOpen ? "mobile-search-open" : ""}`}>
          <div
            className={`input-group top-search-medium ${mobileSearchOpen ? "mobile-open" : ""}`}
            onClick={() => {
              if (isMobileScreen() && !mobileSearchOpen) setMobileSearchOpen(true);
            }}
          >
            <span className="input-group-text"><FiSearch /></span>
            <input
              className="form-control"
              placeholder="Search issues, projects..."
              value={topSearchText}
              onChange={(e) => setTopSearchText(e.target.value)}
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
                  <button className="mark-all-btn" onClick={markAllAsRead} type="button">
                    Mark all as read
                  </button>
                </div>
                <div className="notification-list">
                  {notifications.map(item => (
                    <button
                      key={item.id}
                      className={`notification-item-row ${item.read ? "" : "unread"}`.trim()}
                      onClick={() => markNotificationAsRead(item.id)}
                      type="button"
                    >
                      <div className="notification-title">{item.title}</div>
                      <div className="notification-time">{item.time}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button className="btn create-issue-medium" onClick={() => navigate("/create-issue")}>
            <FiPlus /> Create Issue
          </button>
        </div>

        {/* ===== HEADER + DROPDOWN ===== */}
        <div className="reports-header">
          <div>
            <h1>Reports & Analytics</h1>
            <p className="text-muted">Track project progress and team performance</p>
          </div>

          <select
            className="project-dropdown"
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
          >
            {projects.map(p => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>

        {/* ===== SUMMARY CARDS WITH ICONS ===== */}
        <div className="reports-cards">

          <div className="report-card">
            <FiActivity className="card-icon blue-icon" />
            <div>
              <h4>Total Issues</h4>
              <h2>{totalIssues}</h2>
            </div>
          </div>

          <div className="report-card">
            <FiTarget className="card-icon green-icon" />
            <div>
              <h4>Completion Rate</h4>
              <h2>{completionRate}%</h2>
            </div>
          </div>

          <div className="report-card">
            <FiClock className="card-icon purple-icon" />
            <div>
              <h4>Estimated Hours</h4>
              <h2>{totalEstimated}h</h2>
            </div>
          </div>

          <div className="report-card">
            <FiTrendingUp className="card-icon orange-icon" />
            <div>
              <h4>Logged Hours</h4>
              <h2>{totalLogged}h</h2>
            </div>
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
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={velocityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="sprint" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="points" fill="#0969da" />
              </BarChart>
            </ResponsiveContainer>
          )}

          {activeTab === "burndown" && (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={burndownData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="remaining" stroke="#2da44e" />
              </LineChart>
            </ResponsiveContainer>
          )}

          {activeTab === "distribution" && (
  <div className="distribution-grid">

    {/* ===== Issue Type Distribution ===== */}
    <div className="distribution-card">
      <h4>Issue Type Distribution</h4>
      <p className="text-muted">Breakdown by issue type</p>

      <ResponsiveContainer width="100%" height={250}>
        <BarChart
          data={[
            { type: "Story", value: 6 },
            { type: "Task", value: 2 },
            { type: "Bug", value: 1 },
            { type: "Epic", value: 1 },
          ]}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="type" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" fill="#8250df" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>

    {/* ===== Status Distribution ===== */}
    <div className="distribution-card">
      <h4>Status Distribution</h4>
      <p className="text-muted">Issues by workflow status</p>

      <ResponsiveContainer width="100%" height={250}>
        <BarChart
          data={[
            { status: "To Do", value: 3 },
            { status: "In Progress", value: 3 },
            { status: "Done", value: 1 },
          ]}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="status" />
          <YAxis />
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
