import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from 'react-router-dom'
import "./Teams.css";
import { FiGrid, FiFolder, FiUsers, FiBarChart2, FiCreditCard, FiSettings, FiLogOut, FiMenu, FiSearch, FiBell, FiPlus, FiUser, FiX, FiCheck, FiRepeat, FiArrowRight } from 'react-icons/fi'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const FALLBACK_MEMBERS = [
  { id: 1, name: 'Sarah Johnson', email: 'sarah.johnson@kavyapro.com', role: 'Admin', projects: 3, activeIssues: 8, image: 'https://randomuser.me/api/portraits/women/44.jpg' },
  { id: 2, name: 'Michael Chen', email: 'michael.chen@kavyapro.com', role: 'Developer', projects: 2, activeIssues: 6, image: 'https://randomuser.me/api/portraits/men/32.jpg' },
  { id: 3, name: 'Emily Rodriguez', email: 'emily.rodriguez@kavyapro.com', role: 'Tester', projects: 2, activeIssues: 4, image: 'https://randomuser.me/api/portraits/women/65.jpg' }
];

function calculateStats(data) {
  const adminCount = data.filter((m) => m.role === 'Admin').length;
  const totalIssues = data.reduce((sum, m) => sum + (m.activeIssues || 0), 0);
  const avgWorkload = data.length > 0 ? Math.round(totalIssues / data.length) : 0;

  return {
    totalMembers: data.length,
    activeProjects: 3,
    avgWorkload,
    admins: adminCount
  };
}

export default function Teams() {
  const navigate = useNavigate()
  const { user, clearUser } = useAuth()
  const displayName = user?.name || (user?.email ? user.email.split('@')[0] : 'Guest')
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [selectedOrg, setSelectedOrg] = useState(() => { try { return typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('org') || 'null') : null } catch (e) { return null } })

  useEffect(() => {
    function onOrgChanged(e){ const org = e?.detail || null; setSelectedOrg(org); try { if (org) localStorage.setItem('org', JSON.stringify(org)) } catch(err){} }
    window.addEventListener('org:changed', onOrgChanged)
    return () => window.removeEventListener('org:changed', onOrgChanged)
  }, [])

  const [members, setMembers] = useState(FALLBACK_MEMBERS);
  const [stats, setStats] = useState(calculateStats(FALLBACK_MEMBERS));
  const [usingFallbackData, setUsingFallbackData] = useState(true);

  const [activeTab, setActiveTab] = useState("Members");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("All Roles");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [topSearchText, setTopSearchText] = useState("");
  const [notifications, setNotifications] = useState([
    { id: 1, title: "New member request pending approval", time: "5m ago", read: false },
    { id: 2, title: "Role updated for Sarah Johnson", time: "25m ago", read: false },
    { id: 3, title: "Weekly team summary generated", time: "1h ago", read: true }
  ]);
  const [editingId, setEditingId] = useState(null);
  const [editingMember, setEditingMember] = useState(null);
  const notificationRef = useRef(null);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const [inviteFormData, setInviteFormData] = useState({
    name: '',
    email: '',
    role: 'Developer'
  });

  const API_BASE_URL = (import.meta?.env?.VITE_API_BASE || 'http://localhost:8080');
  const MEMBERS_API_URL = `${API_BASE_URL}/api/members`;
  // Fetch team members and stats on component mount
  useEffect(() => {
    fetchTeamMembers();
  }, []);

  // sync sidebar state from global controller
  useEffect(() => {
    setStats(calculateStats(members));
  }, [members]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const toggleNotifications = () => {
    setShowNotifications((prev) => !prev);
  };

  const markAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const fetchTeamMembers = async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);
    try {
      const response = await fetch(MEMBERS_API_URL, { signal: controller.signal });
      if (!response.ok) {
        throw new Error('Failed to fetch members');
      }
      const data = await response.json();
      setMembers(Array.isArray(data) ? data : []);
      setUsingFallbackData(false);
    } catch (err) {
      setMembers(FALLBACK_MEMBERS);
      setUsingFallbackData(true);
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const handleEdit = (member) => {
    setEditingId(member.id);
    setEditingMember({ ...member });
  };

  const handleSaveEdit = async (memberId) => {
    try {
      const response = await fetch(`${MEMBERS_API_URL}/${memberId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingMember)
      });

      if (!response.ok) {
        throw new Error('Failed to update member');
      }

      const updatedMember = await response.json();
      setMembers(members.map(m => m.id === memberId ? updatedMember : m));
      setEditingId(null);
      setEditingMember(null);
      alert('Member updated successfully');
    } catch (err) {
      if (usingFallbackData) {
        const localUpdatedMember = { ...editingMember, id: memberId };
        setMembers(members.map(m => m.id === memberId ? localUpdatedMember : m));
        setEditingId(null);
        setEditingMember(null);
        return;
      }
      alert('Error updating member: ' + err.message);
      console.error('Error:', err);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingMember(null);
  };

  const handleCardClick = (memberId) => {
    const member = members.find(m => m.id === memberId);
    alert(`Viewing ${member?.name} details`);
  };

  const handleStatClick = (statName) => {
    if (statName === 'Active Projects') {
      navigate('/projects');
      return;
    }
    alert(`Viewing ${statName} details`);
  };

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    
    if (!inviteFormData.name || !inviteFormData.email || !inviteFormData.role) {
      alert('Please fill all fields');
      return;
    }

    try {
      const response = await fetch(MEMBERS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(inviteFormData)
      });

      if (!response.ok) {
        throw new Error('Failed to invite member');
      }

      const newMember = await response.json();
      setMembers([...members, newMember]);
      setShowInviteModal(false);
      setInviteFormData({ name: '', email: '', role: 'Developer' });
      alert('Member invited successfully');
    } catch (err) {
      if (usingFallbackData) {
        const localMember = {
          id: Date.now(),
          ...inviteFormData,
          projects: 0,
          activeIssues: 0,
          image: 'https://randomuser.me/api/portraits/lego/2.jpg'
        };
        setMembers([...members, localMember]);
        setShowInviteModal(false);
        setInviteFormData({ name: '', email: '', role: 'Developer' });
        return;
      }
      alert('Error inviting member: ' + err.message);
      console.error('Error:', err);
    }
  };

  const handleDeleteMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to delete this member?')) {
      return;
    }

    try {
      const response = await fetch(`${MEMBERS_API_URL}/${memberId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete member');
      }

      setMembers(members.filter(m => m.id !== memberId));
      alert('Member deleted successfully');
    } catch (err) {
      if (usingFallbackData) {
        setMembers(members.filter(m => m.id !== memberId));
        return;
      }
      alert('Error deleting member: ' + err.message);
      console.error('Error:', err);
    }
  };

  // Filter members based on search and role
  const filteredMembers = members.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === 'All Roles' || member.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  function handleLogout() {
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

  function isMobileScreen() {
    return typeof window !== 'undefined' && window.innerWidth <= 768
  }

  return (
    <div className="dashboard-root d-flex">
      {/* Sidebar */}
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

      {/* removed separate floating toggle; single toggle button below handles both sizes */}

      {/* Mobile Toggle (also toggles collapsed on large screens) */}
      <button className="mobile-toggle btn btn-sm" onClick={toggleSidebarForScreen} aria-label="Toggle sidebar">
        <FiMenu size={18} />
      </button>

      <div className={`mobile-overlay ${mobileOpen ? 'show' : ''}`} onClick={() => { setMobileOpen(false); setCollapsed(true) }} />

      {/* Main Content */}
      <main className={`content flex-grow-1 p-4 ${collapsed ? 'with-topbar' : ''}`}>
        <div className="team-container">

          {/* Header */}
          <div className="team-header">
              <div>
                <div className={`top-search-row mb-3 ${mobileSearchOpen ? 'mobile-search-open' : ''}`}>
                  <div
                    className={`input-group top-search-medium ${mobileSearchOpen ? 'mobile-open' : ''}`}
                    onClick={() => {
                      if (isMobileScreen() && !mobileSearchOpen) setMobileSearchOpen(true)
                    }}
                  >
                    <span className="input-group-text"><FiSearch /></span>
                    <input
                      className="form-control"
                      placeholder="Search issues, projects..."
                      value={topSearchText}
                      onChange={(e) => setTopSearchText(e.target.value)}
                      onFocus={() => {
                        if (isMobileScreen()) setMobileSearchOpen(true)
                      }}
                    />
                    {mobileSearchOpen && (
                      <button
                        type="button"
                        className="team-search-close"
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
                    <button className="btn btn-link bell-black" title="Notifications" onClick={toggleNotifications}>
                      <FiBell size={20} />
                      {unreadCount > 0 && <span className="notif-count">{unreadCount}</span>}
                    </button>

                    {showNotifications && (
                      <div className="notification-dropdown">
                        <div className="notification-header">
                          <span>Notifications</span>
                          {unreadCount > 0 && (
                            <button className="mark-all-btn" onClick={markAllAsRead}>
                              Mark all read
                            </button>
                          )}
                        </div>

                        <div className="notification-list">
                          {notifications.map((n) => (
                            <button
                              key={n.id}
                              className={`notification-item-row ${n.read ? "read" : "unread"}`}
                              onClick={() => markAsRead(n.id)}
                            >
                              <div className="notification-title">{n.title}</div>
                              <div className="notification-time">{n.time}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <button className="btn create-issue-medium" onClick={() => navigate('/create-issue')}>
                    <FiPlus className="me-1" /> Create Issue
                  </button>
                </div>

                <div>
                  <h1>Team Management</h1>
                  <p>Manage team members, roles, and permissions</p>
                </div>
              </div>

              <div className="header-actions">
                {/* header-actions left intentionally for other right-side controls */}
              </div>
          </div>

          {/* Invite action above stats */}
          <div className="stats-actions">
            <button className="btn create-issue-medium" onClick={() => setShowInviteModal(true)}>
              <FiPlus className="me-1" /> Invite Member
            </button>
          </div>

          {/* Stats Cards - Now Clickable */}
          <div className="stats">
            <div 
              className="card stat-card"
              onClick={() => handleStatClick('Total Members')}
              role="button"
              tabIndex="0"
            >
              <h4>Total Members</h4>
              <h2>{stats.totalMembers}</h2>
            </div>

            <div 
              className="card stat-card"
              onClick={() => handleStatClick('Active Projects')}
              role="button"
              tabIndex="0"
            >
              <h4>Active Projects</h4>
              <h2>{stats.activeProjects}</h2>
            </div>

            <div 
              className="card stat-card"
              onClick={() => handleStatClick('Avg. Workload')}
              role="button"
              tabIndex="0"
            >
              <h4>Avg. Workload</h4>
              <h2>{stats.avgWorkload}</h2>
              <span>issues per member</span>
            </div>

            <div 
              className="card stat-card"
              onClick={() => handleStatClick('Admins')}
              role="button"
              tabIndex="0"
            >
              <h4>Admins</h4>
              <h2>{stats.admins}</h2>
            </div>
          </div>

          {/* Search + Filter */}
          <div className="filters">
            <input 
              type="text" 
              placeholder="Search team members..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
              <option>All Roles</option>
              <option>Admin</option>
              <option>Developer</option>
              <option>Tester</option>
            </select>
          </div>

          {/* Tabs */}
          <div className="tabs">
            <button 
              className={activeTab === "Members" ? "active-tab" : ""}
              onClick={() => setActiveTab("Members")}
            >
              Members
            </button>
            <button 
              className={activeTab === "Roles & Permissions" ? "active-tab" : ""}
              onClick={() => setActiveTab("Roles & Permissions")}
            >
              Roles & Permissions
            </button>
          </div>

          {/* Roles & Permissions Tab Content */}
          {activeTab === "Roles & Permissions" && (
            <div className="roles-permissions-container">
              <div className="roles-grid">
                {/* Admin Role Card */}
                <div className="role-card admin-card">
                  <div className="role-icon">🛡️</div>
                  <h3 className="role-title">Admin</h3>
                  <p className="role-description">Full system access and configuration</p>
                  <ul className="permissions-list">
                    <li>✓ Manage users and roles</li>
                    <li>✓ Create and delete projects</li>
                    <li>✓ Configure workflows</li>
                    <li>✓ Access all reports</li>
                    <li>✓ System settings</li>
                  </ul>
                </div>

                {/* Project Manager Role Card */}
                <div className="role-card pm-card">
                  <div className="role-icon">👤</div>
                  <h3 className="role-title">Project Manager</h3>
                  <p className="role-description">Manage projects and sprints</p>
                  <ul className="permissions-list">
                    <li>✓ Create and manage projects</li>
                    <li>✓ Plan and manage sprints</li>
                    <li>✓ Assign issues to team</li>
                    <li>✓ View reports and analytics</li>
                    <li>✓ Manage project settings</li>
                  </ul>
                </div>

                {/* Developer Role Card */}
                <div className="role-card dev-card">
                  <div className="role-icon">💻</div>
                  <h3 className="role-title">Developer</h3>
                  <p className="role-description">Work on assigned tasks</p>
                  <ul className="permissions-list">
                    <li>✓ View and update issues</li>
                    <li>✓ Log time on tasks</li>
                    <li>✓ Comment and collaborate</li>
                    <li>✓ Move issues on board</li>
                    <li>✓ Create sub-tasks</li>
                  </ul>
                </div>

                {/* Tester Role Card */}
                <div className="role-card tester-card">
                  <div className="role-icon">✓</div>
                  <h3 className="role-title">Tester</h3>
                  <p className="role-description">Test and verify issues</p>
                  <ul className="permissions-list">
                    <li>✓ Create bug reports</li>
                    <li>✓ Test and verify fixes</li>
                    <li>✓ Comment on issues</li>
                    <li>✓ Update issue status</li>
                    <li>✓ View test reports</li>
                  </ul>
                </div>

                {/* Business Analyst Role Card */}
                <div className="role-card ba-card">
                  <div className="role-icon">📋</div>
                  <h3 className="role-title">Business Analyst</h3>
                  <p className="role-description">Requirements and documentation</p>
                  <ul className="permissions-list">
                    <li>✓ Create stories and epics</li>
                    <li>✓ Define requirements</li>
                    <li>✓ Manage backlog</li>
                    <li>✓ View reports</li>
                    <li>✓ Document features</li>
                  </ul>
                </div>

                {/* Viewer Role Card */}
                <div className="role-card viewer-card">
                  <div className="role-icon">👁️</div>
                  <h3 className="role-title">Viewer</h3>
                  <p className="role-description">Read-only access</p>
                  <ul className="permissions-list">
                    <li>✓ View projects and issues</li>
                    <li>✓ View boards and backlogs</li>
                    <li>✓ View reports</li>
                    <li>✓ Comment on issues</li>
                    <li>✓ No edit permissions</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Member Cards */}
          {activeTab === "Members" && filteredMembers.length > 0 ? (
            filteredMembers.map((member) => (
              <div 
                key={member.id}
                className="member-card"
                onClick={() => handleCardClick(member.id)}
              >
                <div className="member-left">
                  <img
                    src={member.image || 'https://randomuser.me/api/portraits/lego/1.jpg'}
                    alt={member.name}
                  />
                  <div>
                    {editingId === member.id ? (
                      <div className="edit-form">
                        <input
                          type="text"
                          value={editingMember.name}
                          onChange={(e) => setEditingMember({...editingMember, name: e.target.value})}
                          placeholder="Name"
                        />
                        <input
                          type="email"
                          value={editingMember.email}
                          onChange={(e) => setEditingMember({...editingMember, email: e.target.value})}
                          placeholder="Email"
                        />
                        <select
                          value={editingMember.role}
                          onChange={(e) => setEditingMember({...editingMember, role: e.target.value})}
                        >
                          <option>Admin</option>
                          <option>Developer</option>
                          <option>Tester</option>
                        </select>
                      </div>
                    ) : (
                      <>
                        <h3>
                          {member.name} 
                          <span className={`role ${member.role.toLowerCase()}`}>
                            {member.role}
                          </span>
                        </h3>
                        <p>{member.email}</p>
                      </>
                    )}
                  </div>
                </div>

                <div className="member-right">
                  {editingId !== member.id && (
                    <>
                      <div className="member-stat">
                        <strong>{member.projects || 0}</strong>
                        <p>Projects</p>
                      </div>
                      <div className="member-stat">
                        <strong>{member.activeIssues || 0}</strong>
                        <p>Active Issues</p>
                      </div>
                    </>
                  )}
                  
                  {editingId === member.id ? (
                    <div className="edit-actions">
                      <button 
                        className="save-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveEdit(member.id);
                        }}
                        title="Save"
                      >
                        <FiCheck size={18} />
                      </button>
                      <button 
                        className="cancel-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancelEdit();
                        }}
                        title="Cancel"
                      >
                        <FiX size={18} />
                      </button>
                    </div>
                  ) : (
                    <button 
                      className="edit-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(member);
                      }}
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            activeTab === "Members" && (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <p>No team members found</p>
              </div>
            )
          )}

        </div>
      </main>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="modal-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Invite Team Member</h2>
              <button 
                className="modal-close"
                onClick={() => setShowInviteModal(false)}
              >
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="invite-form">
              <div className="form-group">
                <label htmlFor="name">Name *</label>
                <input
                  id="name"
                  type="text"
                  placeholder="Enter member name"
                  value={inviteFormData.name}
                  onChange={(e) => setInviteFormData({...inviteFormData, name: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email *</label>
                <input
                  id="email"
                  type="email"
                  placeholder="Enter member email"
                  value={inviteFormData.email}
                  onChange={(e) => setInviteFormData({...inviteFormData, email: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="role">Role *</label>
                <select
                  id="role"
                  value={inviteFormData.role}
                  onChange={(e) => setInviteFormData({...inviteFormData, role: e.target.value})}
                  required
                >
                  <option>Admin</option>
                  <option>Developer</option>
                  <option>Tester</option>
                </select>
              </div>

              <div className="modal-footer">
                <button 
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowInviteModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="btn-invite"
                >
                  Invite Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
