import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from 'react-router-dom'
import "./Teams.css";
import "./Dashboard.css";
import { FiGrid, FiFolder, FiUsers, FiBarChart2, FiCreditCard, FiSettings, FiLogOut, FiMenu, FiSearch, FiBell, FiPlus, FiX, FiCheck, FiRepeat, FiArrowRight } from 'react-icons/fi'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import useIssueNotifications from '../hooks/useIssueNotifications'

const stripLeadingSpace = (value) => value.replace(/^\s+/, '')
const sanitizeName = (value) => stripLeadingSpace(value).replace(/[^A-Za-z\s]/g, '')
const sanitizeEmail = (value) => {
  const cleaned = stripLeadingSpace(value).replace(/[^A-Za-z0-9@.]/g, '')
  const atIndex = cleaned.indexOf('@')
  if (atIndex === -1) return cleaned
  const local = cleaned.slice(0, atIndex)
  const domain = cleaned.slice(atIndex + 1).replace(/[0-9]/g, '')
  return `${local}@${domain}`
}
const isNameValid = (value) => /^[A-Za-z\s]+$/.test(value)
const preventLeadingSpace = (e) => {
  if (e.key === ' ' && (e.currentTarget.selectionStart ?? 0) === 0) e.preventDefault()
}
const getAvatarInitials = (name, email) => {
  const source = (name || '').trim() || (email || '').trim()
  if (!source) return 'G'
  const parts = source.split(/[\s._-]+/).filter(Boolean)
  if (parts.length === 0) return source.charAt(0).toUpperCase()
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase()
}
const normalizeRole = (role) => (role || '').trim().toLowerCase()
const getRoleLabel = (role) => {
  const normalized = normalizeRole(role)
  if (normalized === 'admin' || normalized === 'project manager') return 'Project Manager'
  return role || ''
}
const isProjectManagerRole = (role) => {
  const normalized = normalizeRole(role)
  return normalized === 'admin' || normalized === 'project manager'
}
const isRemovableRole = (role) => {
  const normalized = normalizeRole(role)
  return normalized === 'developer' || normalized === 'tester'
}

const DEFAULT_TEAM_AVATAR = 'https://randomuser.me/api/portraits/lego/1.jpg'
const getTeamAvatar = (image) => {
  const trimmed = (image || '').trim()
  return trimmed ? trimmed : DEFAULT_TEAM_AVATAR
}

const FALLBACK_MEMBERS = [
  { id: 1, name: 'Sarah Johnson', email: 'sarah.johnson@kavyapro.com', role: 'Admin', projects: 3, activeIssues: 8, image: '' },
  { id: 2, name: 'Michael Chen', email: 'michael.chen@kavyapro.com', role: 'Developer', projects: 2, activeIssues: 6, image: '' },
  { id: 3, name: 'Emily Rodriguez', email: 'emily.rodriguez@kavyapro.com', role: 'Tester', projects: 2, activeIssues: 4, image: '' }
];

function calculateStats(data, totalIssuesCount = 0, activeProjectCount = 0) {
  const adminCount = data.filter((m) => {
    const role = normalizeRole(m.role)
    return role === 'admin' || role === 'project manager'
  }).length;
  const totalIssues = totalIssuesCount > 0 ? totalIssuesCount : data.reduce((sum, m) => sum + (m.activeIssues || 0), 0);
  const avgWorkload = data.length > 0 ? Math.round(totalIssues / data.length) : 0;

  return {
    totalMembers: data.length,
    activeProjects: activeProjectCount,
    avgWorkload,
    admins: adminCount,
    totalIssues: totalIssues
  };
}

export default function Teams() {
  const navigate = useNavigate()
  const { user, clearUser } = useAuth()
  const [profileUser, setProfileUser] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const currentUser = profileUser || user || {}
  const displayName = currentUser?.name || (currentUser?.email ? currentUser.email.split('@')[0] : 'Guest')
  const avatarInitials = getAvatarInitials(currentUser?.name, currentUser?.email)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [selectedOrg, setSelectedOrg] = useState(() => { try { return typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('org') || 'null') : null } catch (e) { return null } })

  useEffect(() => {
    function onOrgChanged(e){ const org = e?.detail || null; setSelectedOrg(org); try { if (org) localStorage.setItem('org', JSON.stringify(org)) } catch(err){} }
    window.addEventListener('org:changed', onOrgChanged)
    return () => window.removeEventListener('org:changed', onOrgChanged)
  }, [])

  const [members, setMembers] = useState(FALLBACK_MEMBERS);
  const [issues, setIssues] = useState([]);
  const [stats, setStats] = useState(calculateStats(FALLBACK_MEMBERS));
  const [usingFallbackData, setUsingFallbackData] = useState(true);
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('all');

  const [activeTab, setActiveTab] = useState("Members");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("All Roles");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [topSearchText, setTopSearchText] = useState("");
  const {
    notifications,
    unreadCount,
    loading: notificationsLoading,
    error: notificationsError,
    markAsRead,
    markAllAsRead,
    addNotification,
    dismissNotification,
    clearAllNotifications
  } = useIssueNotifications({ limit: 6 })
  const [editingId, setEditingId] = useState(null);
  const [editingMember, setEditingMember] = useState(null);
  const [nameSearchResults, setNameSearchResults] = useState([]);
  const [nameSearchLoading, setNameSearchLoading] = useState(false);
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const notificationRef = useRef(null);
  const memberListRef = useRef(null);
  const topSearchInputRef = useRef(null);
  const nameSuggestRef = useRef(null);

  const [inviteFormData, setInviteFormData] = useState({
    name: '',
    email: '',
    role: '',
    projectId: ''
  });

  const [emailVerificationStatus, setEmailVerificationStatus] = useState(null); // null, 'verifying', 'verified', 'not-found', 'error'
  const [verifiedEmailUser, setVerifiedEmailUser] = useState(null);

  const API_BASE_URL = (import.meta?.env?.VITE_API_BASE || 'http://localhost:8080');
  const MEMBERS_API_URL = `${API_BASE_URL}/api/members`;
  const ISSUES_API_URL = `${API_BASE_URL}/api/issues`;
  const PROJECTS_API_URL = `${API_BASE_URL}/api/projects`;
  const userEmail = (currentUser?.email || '').trim().toLowerCase();
  const managerEmail = (currentUser?.email || '').trim().toLowerCase();
  const organizationId = selectedOrg?.id || selectedOrg?._id || null;
  const organizationUsername = selectedOrg?.username || selectedOrg?.slug || null;
  const organizationName = selectedOrg?.name || null;
  const isProjectManager = isProjectManagerRole(currentUser?.role);
  const visibleTab = isProjectManager ? activeTab : "Members";

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

  const scopeMembersForUser = (list, allowedEmails = null) => {
    if (!isProjectManager) {
      const normalizedSet = allowedEmails && allowedEmails.size ? allowedEmails : null;
      if (!normalizedSet) {
        if (!userEmail) return [];
        return list.filter((member) => {
          const memberEmail = (member?.email || '').trim().toLowerCase();
          return memberEmail && memberEmail === userEmail;
        });
      }
      return list.filter((member) => {
        const memberEmail = (member?.email || '').trim().toLowerCase();
        return memberEmail && normalizedSet.has(memberEmail);
      });
    }
    return list.filter((member) => {
      const memberEmail = (member?.email || '').trim().toLowerCase();
      if (userEmail && memberEmail === userEmail) return true;
      const managerEmail = (member?.managerEmail || '').trim().toLowerCase();
      if (!managerEmail) return false;
      return managerEmail === userEmail;
    });
  };

  const canRemoveMember = (member) => {
    if (!isProjectManager) return false;
    const normalizedRole = normalizeRole(member?.role);
    if (normalizedRole === 'admin' || normalizedRole === 'project manager') return false;
    const memberEmail = (member?.email || '').trim().toLowerCase();
    if (userEmail && memberEmail === userEmail) return false;
    if (isProjectFilterActive) return true;
    if (!isRemovableRole(member?.role)) return false;
    return true;
  };
  // Fetch team members and stats on component mount
  useEffect(() => {
    fetchTeamMembers();
  }, [managerEmail, userEmail, isProjectManager, organizationId, organizationUsername, organizationName]);

  useEffect(() => {
    fetchIssues();
  }, []);

  useEffect(() => {
    fetchIssues();
  }, [user?.id]);

  // sync sidebar state from global controller
  useEffect(() => {
    fetchProjects();
  }, [managerEmail, userEmail, isProjectManager, organizationId, organizationUsername, organizationName]);

  useEffect(() => {
    setSelectedProjectId('all');
  }, [organizationId, organizationUsername, organizationName]);

  useEffect(() => {
    setEditingId(null);
    setEditingMember(null);
  }, [selectedProjectId]);

  useEffect(() => {
    if (!showInviteModal) return;
    const query = (inviteFormData.name || '').trim();
    if (query.length < 2) {
      setNameSearchResults([]);
      setShowNameSuggestions(false);
      return;
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      try {
        setNameSearchLoading(true);
        const response = await fetch(`${API_BASE_URL}/api/users/search?query=${encodeURIComponent(query)}&limit=6`, {
          signal: controller.signal
        });
        if (!response.ok) {
          setNameSearchResults([]);
          setShowNameSuggestions(true);
          return;
        }
        const data = await response.json();
        const list = Array.isArray(data) ? data : [];
        setNameSearchResults(list);
        setShowNameSuggestions(true);
      } catch (err) {
        if (err.name === 'AbortError') return;
        setNameSearchResults([]);
        setShowNameSuggestions(true);
      } finally {
        setNameSearchLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [inviteFormData.name, showInviteModal, API_BASE_URL]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
      if (nameSuggestRef.current && !nameSuggestRef.current.contains(e.target)) {
        setShowNameSuggestions(false);
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

  const toggleNotifications = () => {
    setShowNotifications((prev) => !prev);
  };


  const fetchTeamMembers = async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);
    try {
      const queryParams = new URLSearchParams();
      if (isProjectManager && managerEmail) {
        queryParams.set('managerEmail', managerEmail);
      } else if (!isProjectManager && userEmail) {
        queryParams.set('memberEmail', userEmail);
      }
      if (organizationId) {
        queryParams.set('organizationId', organizationId);
      } else if (organizationUsername) {
        queryParams.set('organizationUsername', organizationUsername);
      } else if (organizationName) {
        queryParams.set('organizationName', organizationName);
      }
      const query = queryParams.toString();
      const response = await fetch(`${MEMBERS_API_URL}${query ? `?${query}` : ''}`, { signal: controller.signal });
      if (!response.ok) {
        throw new Error('Failed to fetch members');
      }
      const data = await response.json();
      setMembers(Array.isArray(data) ? data : []);
      setUsingFallbackData(false);
    } catch (err) {
      const fallbackMembers = FALLBACK_MEMBERS.map((member) => ({
        ...member,
        managerEmail: currentUser?.email || null
      }));
      setMembers(fallbackMembers);
      setUsingFallbackData(true);
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const fetchProjects = async () => {
    const queryParams = new URLSearchParams();
    if (isProjectManager && managerEmail) {
      queryParams.set('managerEmail', managerEmail);
    } else if (!isProjectManager && userEmail) {
      queryParams.set('memberEmail', userEmail);
    }
    if (organizationId) {
      queryParams.set('organizationId', organizationId);
    } else if (organizationUsername) {
      queryParams.set('organizationUsername', organizationUsername);
    } else if (organizationName) {
      queryParams.set('organizationName', organizationName);
    }
    const query = queryParams.toString();
    if (!query) {
      setProjects([]);
      return;
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    setProjectsLoading(true);
    setProjectsError('');
    try {
      const response = await fetch(`${PROJECTS_API_URL}?${query}`, { signal: controller.signal });
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      const data = await response.json();
      const list = Array.isArray(data) ? data : [];
      setProjects(list);
    } catch (err) {
      setProjects([]);
      setProjectsError(err.message || 'Unable to load projects');
    } finally {
      clearTimeout(timeoutId);
      setProjectsLoading(false);
    }
  };

  const fetchIssues = async () => {
    if (!user?.id) {
      setIssues([]);
      return;
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    try {
      const response = await fetch(ISSUES_API_URL, {
        signal: controller.signal,
        headers: { 'X-USER-ID': String(user.id) }
      });
      if (!response.ok) {
        console.error('Issues API response not ok:', response.status);
        throw new Error('Failed to fetch issues');
      }
      const data = await response.json();
      const issuesArray = Array.isArray(data)
        ? data
        : (Array.isArray(data?.data)
          ? data.data
          : (Array.isArray(data?.issues) ? data.issues : []));
      setIssues(issuesArray);
    } catch (err) {
      console.error('Error fetching issues:', err);
      setIssues([]);
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const updateMembersWithActiveIssues = (membersData, issuesData) => {
    return membersData.map(member => {
      const memberIssues = issuesData.filter(issue => 
        issue.creatorEmail && 
        issue.creatorEmail.toLowerCase() === member.email.toLowerCase()
      );
      return {
        ...member,
        activeIssues: memberIssues.length
      };
    });
  };

  const handleEdit = (member) => {
    if (!isProjectManager) return;
    setEditingId(member.id);
    setEditingMember({ ...member });
  };

  const updateProjectTeamMembers = async (nextTeamMembers, projectOverride = null) => {
    const projectTarget = projectOverride || selectedProject;
    if (!projectTarget || !projectTarget.id) {
      throw new Error('Project not found.');
    }
    const payload = {
      ...projectTarget,
      teamMembers: nextTeamMembers
    };
    const response = await fetch(`${PROJECTS_API_URL}/${projectTarget.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to update project team');
    }

    const updatedProject = await response.json();
    setProjects((current) => current.map((project) => (
      project.id === updatedProject.id ? updatedProject : project
    )));
    return updatedProject;
  };

  const handleSaveEdit = async (memberId) => {
    if (!editingMember) return;
    if (isProjectFilterActive) {
      try {
        const normalizedEmail = (editingMember.email || '').trim().toLowerCase();
        if (!normalizedEmail) {
          alert('Email is required');
          return;
        }
        const updatedEntry = {
          memberId: editingMember.memberId || editingMember.id || null,
          name: editingMember.name || '',
          email: normalizedEmail,
          role: editingMember.role || 'Developer',
          status: editingMember.status || 'Invited'
        };
        const currentTeam = Array.isArray(selectedProject?.teamMembers) ? selectedProject.teamMembers : [];
        let found = false;
        const nextTeam = currentTeam.map((member) => {
          const memberEmail = (member?.email || '').trim().toLowerCase();
          const memberIdValue = member?.memberId || member?.id || null;
          const matchesEmail = normalizedEmail && memberEmail === normalizedEmail;
          const matchesId = updatedEntry.memberId && memberIdValue && String(memberIdValue) === String(updatedEntry.memberId);
          if (matchesEmail || matchesId) {
            found = true;
            return { ...member, ...updatedEntry };
          }
          return member;
        });
        if (!found) {
          nextTeam.push(updatedEntry);
        }

        await updateProjectTeamMembers(nextTeam);
        setEditingId(null);
        setEditingMember(null);
        alert('Member updated successfully');
      } catch (err) {
        alert('Error updating project member: ' + err.message);
      }
      return;
    }

    try {
      const normalizedEmail = (editingMember.email || '').trim().toLowerCase();
      if (!normalizedEmail) {
        alert('Email is required');
        return;
      }
      const existingMember = members.find((member) => {
        const memberEmail = (member?.email || '').trim().toLowerCase();
        return memberEmail && memberEmail === normalizedEmail;
      });
      const memberRecordId = editingMember.memberRecordId || existingMember?.id || null;
      const payload = {
        name: editingMember.name || '',
        email: normalizedEmail,
        role: editingMember.role || 'Developer',
        managerEmail: (editingMember.managerEmail || currentUser?.email || '').trim() || undefined,
        image: editingMember.image || editingMember.avatar || undefined,
        organizationId: organizationId || undefined,
        organizationUsername: organizationUsername || undefined,
        organizationName: organizationName || undefined
      };

      const upsertMember = async () => {
        const response = await fetch(MEMBERS_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || 'Failed to update member');
        }
        const createdMember = await response.json();
        setMembers((prev) => {
          const list = Array.isArray(prev) ? prev : [];
          const existsIndex = list.findIndex((member) => (member?.email || '').trim().toLowerCase() === normalizedEmail);
          if (existsIndex === -1) return [...list, createdMember];
          const next = [...list];
          next[existsIndex] = createdMember;
          return next;
        });
      };

      if (!memberRecordId) {
        await upsertMember();
        setEditingId(null);
        setEditingMember(null);
        alert('Member updated successfully');
        return;
      }

      const response = await fetch(`${MEMBERS_API_URL}/${memberRecordId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (response.status === 404) {
        await upsertMember();
        setEditingId(null);
        setEditingMember(null);
        alert('Member updated successfully');
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to update member');
      }

      const updatedMember = await response.json();
      setMembers((prev) => prev.map(m => m.id === memberRecordId ? updatedMember : m));
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

  const handleCardClick = (member) => {
    if (!isProjectManager) {
      return;
    }
    if (!member || editingId === member?.id) {
      return;
    }
    setSelectedMember(member);
    setShowMemberModal(true);
  };

  const handleCloseMemberModal = () => {
    setShowMemberModal(false);
    setSelectedMember(null);
  };

  const scrollToMemberList = () => {
    if (!memberListRef.current) return;
    memberListRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleStatClick = (statName) => {
    if (statName === 'Active Projects') {
      navigate('/projects');
      return;
    }
    if (statName === 'Avg. Workload') {
      navigate('/all-my-issues');
      return;
    }
    if (statName === 'Project Managers') {
      setActiveTab('Members');
      setSelectedRole('Admin');
      setSearchTerm('');
      setTimeout(scrollToMemberList, 0);
      return;
    }
    if (statName === 'Total Members') {
      setActiveTab('Members');
      setSelectedRole('All Roles');
      setSearchTerm('');
      setTimeout(scrollToMemberList, 0);
      return;
    }
    alert(`Viewing ${statName} details`);
  };

  const verifyEmailAddress = async () => {
    if (!inviteFormData.email) {
      alert('Please enter an email address');
      return;
    }

    setEmailVerificationStatus('verifying');

    try {
      const email = sanitizeEmail(inviteFormData.email || '').trim().toLowerCase();
      
      // Check if user exists in the database by email
      const response = await fetch(`${API_BASE_URL}/api/users/verify-email?email=${encodeURIComponent(email)}`);
      
      console.log('Email verification response:', response.status, response.ok);
      
        if (response.ok) {
          const userData = await response.json();
          console.log('User found:', userData);
          setVerifiedEmailUser(userData);
          setEmailVerificationStatus('verified');
          // Always sync the name from DB once verified
          const dbName = sanitizeName(userData?.name || '').trim();
          const dbRole = (userData?.role || '').trim();
          setInviteFormData((prev) => ({
            ...prev,
            name: dbName || prev.name,
            email,
            role: dbRole
          }));
          alert(`Email verified! User: ${userData.name || userData.email}`);
        } else if (response.status === 404) {
          setEmailVerificationStatus('not-found');
          setVerifiedEmailUser(null);
          setInviteFormData((prev) => ({ ...prev, role: '' }));
          alert('Email not found in database. Please check the email address.');
        } else {
          const errorText = await response.text();
          console.error('Verification error response:', errorText);
          setEmailVerificationStatus('error');
          setVerifiedEmailUser(null);
          setInviteFormData((prev) => ({ ...prev, role: '' }));
          alert('Error verifying email. Server response: ' + response.status);
        }
      } catch (err) {
        setEmailVerificationStatus('error');
        setVerifiedEmailUser(null);
        setInviteFormData((prev) => ({ ...prev, role: '' }));
        console.error('Verification error:', err);
        alert('Failed to verify email: ' + err.message);
      }
  };

  const resetInviteForm = () => {
    setInviteFormData({ name: '', email: '', role: '', projectId: '' })
    setEmailVerificationStatus(null)
    setVerifiedEmailUser(null)
    setNameSearchResults([])
    setShowNameSuggestions(false)
  }

  const closeInviteModal = () => {
    setShowInviteModal(false)
    resetInviteForm()
  }

  const handleInviteSubmit = async (e) => {
    e.preventDefault();

    const normalizedName = sanitizeName(inviteFormData.name || '').trim()
    const normalizedEmail = sanitizeEmail(inviteFormData.email || '').trim().toLowerCase()
    const normalizedRole = (inviteFormData.role || '').trim()

    if (!normalizedName || !normalizedEmail || !normalizedRole) {
      alert('Please fill all fields');
      return;
    }

    if (!isNameValid(normalizedName)) {
      alert('Name should contain only alphabets');
      return;
    }

    const emailAtIndex = normalizedEmail.indexOf('@')
    if (emailAtIndex === -1 || !normalizedEmail.slice(emailAtIndex + 1)) {
      alert('Please enter a valid email address');
      return;
    }

    if (/\d/.test(normalizedEmail.slice(emailAtIndex + 1))) {
      alert('Numbers are not allowed after @ in the email');
      return;
    }

    if (emailVerificationStatus !== 'verified') {
      alert('Please verify the email address first by clicking the Verify button');
      return;
    }

    try {
      const managerEmail = (currentUser?.email || '').trim();
      if (!managerEmail) {
        alert('Unable to identify your account. Please log out and log in again.');
        return;
      }
      const selectedProjectForInvite = inviteFormData.projectId
        ? projects.find((project) => {
          const idValue = project?.id ? String(project.id) : '';
          const matchId = idValue && idValue === String(inviteFormData.projectId);
          const matchKey = getProjectId(project) === inviteFormData.projectId;
          return matchId || matchKey;
        })
        : null;
      if (selectedProjectForInvite && normalizedEmail) {
        const currentTeam = Array.isArray(selectedProjectForInvite.teamMembers)
          ? selectedProjectForInvite.teamMembers
          : [];
        const alreadyInTeam = currentTeam.some((member) => {
          const memberEmail = (member?.email || '').trim().toLowerCase();
          return memberEmail && memberEmail === normalizedEmail;
        });
        if (alreadyInTeam) {
          alert('This member already exists in the selected project team.');
          return;
        }
      }
    const payload = {
      ...inviteFormData,
      name: normalizedName,
      email: normalizedEmail,
      role: normalizedRole,
      projectId: undefined,
      managerEmail
    };
      const response = await fetch(MEMBERS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (response.status === 409) {
        const conflictMessage = await response.text();
        alert(conflictMessage || 'Member already exists in a team.');
        return;
      }
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to invite member');
      }

      const newMember = await response.json();
      
      // Send invitation email
      try {
        await sendInvitationEmail(normalizedEmail, normalizedName, normalizedRole);
      } catch (emailErr) {
        console.warn('Email sending failed, but member was added:', emailErr);
      }
      
      setMembers([...members, newMember]);

      if (selectedProjectForInvite) {
        try {
          const currentTeam = Array.isArray(selectedProjectForInvite.teamMembers)
            ? selectedProjectForInvite.teamMembers
            : [];
          const existingIndex = currentTeam.findIndex((member) => {
            const memberEmail = (member?.email || '').trim().toLowerCase();
            return memberEmail && memberEmail === normalizedEmail;
          });
          const newTeamEntry = {
            memberId: newMember?.id || newMember?.memberId || null,
            name: normalizedName,
            email: normalizedEmail,
            role: normalizedRole,
            status: 'Invited'
          };
          const nextTeam = existingIndex >= 0
            ? currentTeam.map((member, index) => index === existingIndex ? { ...member, ...newTeamEntry } : member)
            : [...currentTeam, newTeamEntry];
          await updateProjectTeamMembers(nextTeam, selectedProjectForInvite);
        } catch (err) {
          console.warn('Failed to attach member to project:', err);
          alert('Member invited, but adding to the project failed.');
        }
      }

      closeInviteModal();
      alert('Member invited successfully and email sent');
    } catch (err) {
      if (usingFallbackData) {
        const localMember = {
          id: Date.now(),
          ...inviteFormData,
          name: normalizedName,
          email: normalizedEmail,
          role: normalizedRole,
          managerEmail: currentUser?.email || null,
          projects: 0,
          activeIssues: 0,
          image: ''
        };
        setMembers([...members, localMember]);
        closeInviteModal();
        return;
      }
      alert('Error inviting member: ' + err.message);
      console.error('Error:', err);
    }
  };

  const sendInvitationEmail = async (email, name, role) => {
    const SEND_EMAIL_URL = `${API_BASE_URL}/api/email/send-invitation`;
    
    const emailPayload = {
      recipientEmail: email,
      recipientName: name,
      role: role,
      invitedBy: displayName,
      organizationName: selectedOrg?.name || 'KavyaProMan'
    };

    const response = await fetch(SEND_EMAIL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload)
    });

    if (!response.ok) {
      throw new Error('Failed to send invitation email');
    }

    return await response.json();
  };

  function getProjectMatchKeys(project) {
    if (!project) return new Set();
    const keys = [
      project.projectKey,
      project.id,
      project.name
    ]
      .map((value) => (value || '').toString().trim().toLowerCase())
      .filter(Boolean);
    return new Set(keys);
  }

  function getActiveIssuesForMember(memberEmail, projectKeys = null) {
    if (!memberEmail) return 0;
    const normalizedEmail = memberEmail.toLowerCase();
    const issueList = Array.isArray(issues) ? issues : [];
    return issueList.filter(issue => {
      const assigneeEmail = (issue?.assigneeEmail || issue?.assignee || issue?.creatorEmail || '').toLowerCase();
      if (!assigneeEmail || assigneeEmail !== normalizedEmail) {
        return false;
      }
      if (projectKeys && projectKeys.size > 0) {
        const issueProject = (issue?.project || '').toString().trim().toLowerCase();
        if (!projectKeys.has(issueProject)) return false;
      }
      return true;
    }).length;
  }

  function ensureManagerOnTop(list, activeProjectCount, completedProjectCount = 0, forceTop = true, projectKeys = null) {
    if (!isProjectManager || !managerEmail) return list;
    const normalizedManagerEmail = managerEmail.trim().toLowerCase();
    const managerEntry = {
      id: 'manager-self',
      name: displayName || 'Project Manager',
      email: normalizedManagerEmail,
      role: 'Admin',
      projects: activeProjectCount,
      completedProjects: completedProjectCount,
      activeIssues: getActiveIssuesForMember(normalizedManagerEmail, projectKeys),
      image: currentUser?.avatar || ''
    };
    const existingIndex = list.findIndex((member) => (member?.email || '').trim().toLowerCase() === normalizedManagerEmail);
    if (existingIndex === -1) {
      return [managerEntry, ...list];
    }
    const existing = list[existingIndex];
    const merged = {
      ...existing,
      ...managerEntry,
      name: existing.name || managerEntry.name,
      image: existing.image || managerEntry.image,
      role: managerEntry.role
    };
    if (!forceTop) {
      const updated = [...list];
      updated[existingIndex] = merged;
      return updated;
    }
    return [merged, ...list.filter((_, index) => index !== existingIndex)];
  }

  const openRemoveModal = (member) => {
    setMemberToRemove(member);
    setShowRemoveModal(true);
  };

  const closeRemoveModal = () => {
    setShowRemoveModal(false);
    setMemberToRemove(null);
  };

  const handleDeleteMember = async (memberId) => {
    if (isProjectFilterActive) {
      if (!selectedProject) {
        alert('Please select a project first.');
        return;
      }
      try {
        const targetEmail = (memberToRemove?.email || '').trim().toLowerCase();
        const currentTeam = Array.isArray(selectedProject.teamMembers) ? selectedProject.teamMembers : [];
        const nextTeam = currentTeam.filter((member) => {
          const memberEmail = (member?.email || '').trim().toLowerCase();
          const memberIdValue = member?.memberId || member?.id || null;
          if (targetEmail) {
            return memberEmail !== targetEmail;
          }
          return String(memberIdValue) !== String(memberId);
        });
        await updateProjectTeamMembers(nextTeam);
        alert('Member removed from project successfully');
      } catch (err) {
        alert('Error removing member from project: ' + err.message);
      }
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

  const getProjectId = (project) => (project?.id || project?.projectKey || project?.key || project?.code || '').toString();
  const isProjectCompleted = (project) => {
    if (!project) return false;
    if (project?.isArchived) return true;
    const total = Number(project?.totalIssues ?? 0);
    const completed = Number(project?.completedIssues ?? 0);
    return total > 0 && completed >= total;
  };
  const completedProjects = projects.filter((project) => isProjectCompleted(project));
  const activeProjects = projects.filter((project) => !isProjectCompleted(project));
  const selectedProject = selectedProjectId && selectedProjectId !== 'all'
    ? activeProjects.find((project) => getProjectId(project) === selectedProjectId)
    : null;
  const isProjectFilterActive = !!selectedProject;
  const projectFilterKeys = selectedProject ? getProjectMatchKeys(selectedProject) : null;
  const allProjectKeys = projects.reduce((keys, project) => {
    getProjectMatchKeys(project).forEach((key) => keys.add(key));
    return keys;
  }, new Set());
  const managerEmailNormalized = managerEmail.trim().toLowerCase();
  const isManagerEmail = (email) => isProjectManager && !!email && managerEmailNormalized && email === managerEmailNormalized;

  const projectMemberEmails = new Set();
  if (!isProjectManager) {
    projects.forEach((project) => {
      const team = Array.isArray(project?.teamMembers) ? project.teamMembers : [];
      team.forEach((member) => {
        const email = (member?.email || '').trim().toLowerCase();
        if (email) projectMemberEmails.add(email);
      });
    });
    if (userEmail) {
      projectMemberEmails.add(userEmail);
    }
  }

  const scopedMembers = scopeMembersForUser(members, projectMemberEmails);
  const activeProjectCountByEmail = activeProjects.reduce((acc, project) => {
    const team = Array.isArray(project?.teamMembers) ? project.teamMembers : [];
    team.forEach((member) => {
      const email = (member?.email || '').trim().toLowerCase();
      if (!email) return;
      acc.set(email, (acc.get(email) || 0) + 1);
    });
    return acc;
  }, new Map());
  const completedProjectCountByEmail = completedProjects.reduce((acc, project) => {
    const team = Array.isArray(project?.teamMembers) ? project.teamMembers : [];
    team.forEach((member) => {
      const email = (member?.email || '').trim().toLowerCase();
      if (!email) return;
      acc.set(email, (acc.get(email) || 0) + 1);
    });
    return acc;
  }, new Map());

  const memberMap = new Map();
  scopedMembers.forEach((member, index) => {
    const email = (member?.email || '').trim().toLowerCase();
    if (!email) return;
    memberMap.set(email, {
      id: member?.id || member?.memberId || email || `member-${index}`,
      memberRecordId: member?.id || member?.memberId || null,
      memberId: member?.memberId || member?.id || null,
      name: member?.name || member?.email || 'Member',
      email: member?.email || '',
      role: isManagerEmail(email) ? 'Admin' : (member?.role || 'Developer'),
      image: member?.image || member?.avatar || ''
    });
  });

  projects.forEach((project, projectIndex) => {
    const team = Array.isArray(project?.teamMembers) ? project.teamMembers : [];
    const projectId = getProjectId(project) || `project-${projectIndex}`;
    team.forEach((member, index) => {
      const email = (member?.email || '').trim().toLowerCase();
      if (!email) return;
      const existing = memberMap.get(email);
      if (existing) {
        memberMap.set(email, {
          ...existing,
          name: existing.name || member?.name || member?.email || 'Member',
          role: isManagerEmail(email) ? 'Admin' : (existing.role || member?.role || 'Developer'),
          image: existing.image || member?.avatar || member?.image || '',
          memberRecordId: existing.memberRecordId || member?.memberId || member?.id || null
        });
        return;
      }
      memberMap.set(email, {
        id: member?.memberId || member?.id || email || `${projectId}-${index}`,
        memberRecordId: member?.memberId || member?.id || null,
        memberId: member?.memberId || member?.id || null,
        name: member?.name || member?.email || 'Member',
        email: member?.email || '',
        role: isManagerEmail(email) ? 'Admin' : (member?.role || 'Developer'),
        image: member?.avatar || member?.image || ''
      });
    });
  });

  const allMembers = Array.from(memberMap.values()).map((member) => {
    const email = (member?.email || '').trim().toLowerCase();
    return {
      ...member,
      projects: activeProjectCountByEmail.get(email) || 0,
      completedProjects: completedProjectCountByEmail.get(email) || 0,
      activeIssues: getActiveIssuesForMember(member?.email || '', allProjectKeys)
    };
  });

  const selectedProjectIsCompleted = selectedProject ? isProjectCompleted(selectedProject) : false;
  const selectedProjectActiveCount = selectedProject ? (selectedProjectIsCompleted ? 0 : 1) : 0;
  const selectedProjectCompletedCount = selectedProject ? (selectedProjectIsCompleted ? 1 : 0) : 0;

  const projectTeamMembers = selectedProject
    ? (Array.isArray(selectedProject.teamMembers) ? selectedProject.teamMembers : []).map((member, index) => {
      const email = (member?.email || '').trim().toLowerCase();
      return {
        id: member?.memberId || member?.id || `${selectedProjectId}-${index}`,
        memberId: member?.memberId || member?.id || null,
        name: member?.name || member?.email || 'Member',
        email: member?.email || '',
        role: member?.role || 'Developer',
        projects: selectedProjectActiveCount,
        completedProjects: selectedProjectCompletedCount,
        activeIssues: getActiveIssuesForMember(member?.email || '', projectFilterKeys),
        image: member?.avatar || ''
      };
    })
    : allMembers;

  const isSelfMember = (member) => {
    const memberEmail = (member?.email || '').trim().toLowerCase();
    return !!userEmail && memberEmail === userEmail;
  };

  const baseMembers = selectedProject ? projectTeamMembers : allMembers;
  const filteredMembers = baseMembers.filter((member) => {
    const name = (member?.name || '').toLowerCase();
    const email = (member?.email || '').toLowerCase();
    const matchesSearch = name.includes(searchTerm.toLowerCase()) || email.includes(searchTerm.toLowerCase());
    const isProjectManagerRoleMatch = selectedRole === 'Admin' && normalizeRole(member.role) === 'project manager';
    const matchesRole = selectedRole === 'All Roles' || member.role === selectedRole || isProjectManagerRoleMatch;
    return matchesSearch && matchesRole;
  });

  const managerProjectKeys = selectedProject ? projectFilterKeys : allProjectKeys;
  const managerActiveProjectCount = selectedProject ? selectedProjectActiveCount : activeProjects.length;
  const managerCompletedProjectCount = selectedProject ? selectedProjectCompletedCount : completedProjects.length;

  const prioritizedMembers = ensureManagerOnTop(
    filteredMembers,
    managerActiveProjectCount,
    managerCompletedProjectCount,
    true,
    managerProjectKeys
  );

  const hasTeamForProjectManager = isProjectManager
    ? baseMembers.some((member) => !isSelfMember(member))
    : true;

  // sync sidebar state from global controller
  useEffect(() => {
    const activeProjectCount = activeProjects.length;
    if (selectedProject) {
      const teamMembersForStats = ensureManagerOnTop(
        projectTeamMembers,
        selectedProjectActiveCount,
        selectedProjectCompletedCount,
        false,
        projectFilterKeys
      );
      const totalIssues = teamMembersForStats.reduce(
        (sum, member) => sum + (member.activeIssues ?? getActiveIssuesForMember(member.email, projectFilterKeys)),
        0
      );
      setStats(calculateStats(teamMembersForStats, totalIssues, selectedProjectActiveCount));
      return;
    }
    const membersForStats = ensureManagerOnTop(
      allMembers,
      activeProjectCount,
      completedProjects.length,
      false,
      allProjectKeys
    );
    const totalIssues = membersForStats.reduce(
      (sum, member) => sum + (member.activeIssues ?? getActiveIssuesForMember(member.email, allProjectKeys)),
      0
    );
    setStats(calculateStats(membersForStats, totalIssues, activeProjectCount));
  }, [members, issues, userEmail, isProjectManager, projects, selectedProjectId]);

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

  function handleSidebarNavigation() {
    setShowInviteModal(false);
    setShowRemoveModal(false);
    setShowMemberModal(false);
    if (typeof window !== 'undefined' && window.innerWidth < 992) {
      setMobileOpen(false);
      setCollapsed(true);
    }
  }

  return (
    <div className="dashboard-root d-flex">
      {/* Sidebar */}
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
              <NavLink to="/dashboard" onClick={handleSidebarNavigation} className={({isActive})=> `nav-item d-flex align-items-center mb-2 ${isActive? 'active':''}`}>
                <FiGrid className="me-3 nav-icon"/> <span className="nav-text">Dashboard</span>
              </NavLink>
              <NavLink to="/projects" onClick={handleSidebarNavigation} className={({isActive})=> `nav-item d-flex align-items-center mb-2 ${isActive? 'active':''}`}>
                <FiFolder className="me-3 nav-icon"/> <span className="nav-text">Projects</span>
              </NavLink>
              <NavLink to="/teams" onClick={handleSidebarNavigation} className={({isActive})=> `nav-item d-flex align-items-center mb-2 ${isActive? 'active':''}`}>
                <FiUsers className="me-3 nav-icon"/> <span className="nav-text">Teams</span>
              </NavLink>
              <NavLink to="/reports" onClick={handleSidebarNavigation} className={({isActive})=> `nav-item d-flex align-items-center mb-2 ${isActive? 'active':''}`}>
                <FiBarChart2 className="me-3 nav-icon"/> <span className="nav-text">Reports</span>
              </NavLink>
              <NavLink to="/subscription" onClick={handleSidebarNavigation} className={({isActive})=> `nav-item d-flex align-items-center mb-2 ${isActive? 'active':''}`}>
                <FiCreditCard className="me-3 nav-icon"/> <span className="nav-text">Subscription</span>
              </NavLink>
              <NavLink to="/settings" onClick={handleSidebarNavigation} className={({isActive})=> `nav-item d-flex align-items-center mb-2 ${isActive? 'active':''}`}>
                <FiSettings className="me-3 nav-icon"/> <span className="nav-text">Settings</span>
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
            <div className="user-role">{getRoleLabel(currentUser?.role || 'Member')}</div>
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
                      value={topSearchText}
                      onChange={(e) => setTopSearchText(e.target.value)}
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
                            <div className="muted p-3">{notificationsError || "No notifications yet"}</div>
                          )}
                          {!notificationsLoading && notifications.length > 0 && notifications.map((n) => (
                            <div
                              key={n.id}
                              className={`notification-item-row ${n.read ? "read" : "unread"}`}
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

                  {isProjectManager && (
                    <button className="btn create-issue-medium" onClick={() => navigate('/create-issue')}>
                      <FiPlus className="me-1" /> Create Issue
                    </button>
                  )}
                </div>

                <div>
                  <h1>{isProjectManager ? 'Team Management' : 'My Team'}</h1>
                  <p>{isProjectManager ? 'Manage team members, roles, and permissions' : 'Team members working with you on assigned projects'}</p>
                </div>
              </div>

              <div className="header-actions">
                {/* header-actions left intentionally for other right-side controls */}
              </div>
          </div>

          {/* Invite action above stats */}
          {isProjectManager && (
            <div className="stats-actions">
              <button className="btn create-issue-medium" onClick={() => setShowInviteModal(true)}>
                <FiPlus className="me-1" /> Invite Member
              </button>
            </div>
          )}

          {/* Stats Cards - Now Clickable */}
          {isProjectManager && (
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
              <span>{stats.totalIssues} total issues / {stats.totalMembers} members</span>
            </div>

            <div 
              className="card stat-card"
              onClick={() => handleStatClick('Project Managers')}
              role="button"
              tabIndex="0"
            >
              <h4>Project Managers</h4>
              <h2>{stats.admins}</h2>
            </div>
            </div>
          )}

          {/* Search + Filter */}
          <div className="filters">
            <input 
              type="text" 
              placeholder="Search team members..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select
              className="project-filter"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              disabled={projectsLoading || activeProjects.length === 0}
            >
              {activeProjects.length === 0 ? (
                <option value="all">
                  {projectsLoading ? 'Loading projects...' : 'No active projects'}
                </option>
              ) : (
                <>
                  <option value="all">All Projects</option>
                  {activeProjects.map((project) => (
                    <option key={getProjectId(project)} value={getProjectId(project)}>
                      {project?.name || 'Untitled Project'} {project?.projectKey ? `(${project.projectKey})` : ''}
                    </option>
                  ))}
                </>
              )}
            </select>
            <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
              <option>All Roles</option>
              <option value="Admin">Project Manager</option>
              <option>Developer</option>
              <option>Tester</option>
            </select>
          </div>
          {projectsError && (
            <div className="project-filter-hint">{projectsError}</div>
          )}

          {/* Tabs */}
          {isProjectManager && (
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
          )}

          {/* Roles & Permissions Tab Content */}
          {isProjectManager && visibleTab === "Roles & Permissions" && (
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
          {visibleTab === "Members" && (
            <div className="member-cards" ref={memberListRef}>
              {prioritizedMembers.length > 0 ? (
                prioritizedMembers.map((member) => (
                  <div 
                    key={member.id}
                    className={`member-card ${!isProjectManager ? 'member-card-readonly' : ''} ${isProjectManager && isSelfMember(member) ? 'manager-highlight' : ''}`}
                    onClick={isProjectManager ? () => handleCardClick(member) : undefined}
                    onKeyDown={isProjectManager ? (event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleCardClick(member);
                      }
                    } : undefined}
                    role={isProjectManager ? "button" : undefined}
                    tabIndex={isProjectManager ? "0" : undefined}
                  >
                    <div className="member-left">
                      <img
                        src={getTeamAvatar(member.image || member.avatar)}
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
                              <option value="Admin">Project Manager</option>
                              <option>Developer</option>
                              <option>Tester</option>
                            </select>
                          </div>
                        ) : (
                          <>
                            <h3>
                              {member.name} 
                              <span className={`role ${member.role.toLowerCase()}`}>
                                {getRoleLabel(member.role)}
                              </span>
                            </h3>
                            <p>{member.email}</p>
                          </>
                        )}
                      </div>
                    </div>

                    {isProjectManager && (
                      <div className="member-right">
                        {editingId === member.id ? (
                        <div className="edit-actions">
                          <button
                            type="button"
                            className="save-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSaveEdit(member.id);
                            }}
                          >
                            <FiCheck size={14} className="me-1" /> Save
                          </button>
                          <button
                            type="button"
                            className="cancel-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelEdit();
                            }}
                          >
                            <FiX size={14} className="me-1" /> Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                        {isProjectFilterActive ? (
                          <div
                            className={`project-status-badge ${selectedProjectIsCompleted ? 'completed' : 'active'}`}
                            title={selectedProjectIsCompleted ? 'This project is completed' : 'This project is active'}
                          >
                            {selectedProjectIsCompleted ? 'Completed Project' : 'Active Project'}
                          </div>
                        ) : (
                          <>
                            <div className="member-stat">
                              <strong>{member.projects || 0}</strong>
                              <p>Active Projects</p>
                            </div>
                            <div className="member-stat">
                              <strong>{member.completedProjects || 0}</strong>
                              <p>Completed Projects</p>
                            </div>
                          </>
                        )}
                        <div className="member-stat">
                          <strong>{member.activeIssues || 0}</strong>
                          <p>Active Issues</p>
                        </div>
                        {isProjectManager && (
                          <div className="member-actions">
                            <button
                              type="button"
                              className="edit-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(member);
                              }}
                            >
                              Edit
                            </button>
                            {canRemoveMember(member) && (
                              <button
                                type="button"
                                className="remove-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openRemoveModal(member);
                                }}
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        )}
                      </>
                    )}
                      </div>
                    )}
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <p>
                  {selectedProject
                    ? 'No team members found for this project yet.'
                    : (isProjectManager && !hasTeamForProjectManager
                      ? "You don't have a team yet."
                      : 'No team members found')}
                </p>
              </div>
            )}
          </div>
          )}

        </div>
      </main>

      {/* Remove Member Modal */}
      {showRemoveModal && (
        <div className="modal-overlay" onClick={closeRemoveModal}>
          <div className="modal-content remove-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Remove Member</h2>
              <button 
                className="modal-close"
                onClick={closeRemoveModal}
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="confirm-body">
              <p className="confirm-title">
                Are you sure you want to remove{" "}
                <span className="confirm-name">{memberToRemove?.name || 'this member'}</span>?
              </p>
              <p className="confirm-subtitle">
                They will lose access to projects, issues, and team resources immediately.
              </p>
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" type="button" onClick={closeRemoveModal}>
                Cancel
              </button>
              <button
                className="btn-danger"
                type="button"
                onClick={() => {
                  if (!memberToRemove) return;
                  handleDeleteMember(memberToRemove.id);
                  closeRemoveModal();
                }}
              >
                Remove Member
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
        {showInviteModal && (
          <div className="modal-overlay" onClick={closeInviteModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Invite Team Member</h2>
                <button 
                  className="modal-close"
                  onClick={closeInviteModal}
                >
                  <FiX size={20} />
                </button>
              </div>

            <form onSubmit={handleInviteSubmit} className="invite-form">
              <div className="form-group">
                <label htmlFor="name">Name *</label>
                <div className="name-suggest-wrapper" ref={nameSuggestRef}>
                    <input
                      id="name"
                      type="text"
                      placeholder="Enter member name"
                      value={inviteFormData.name}
                      onFocus={() => {
                        if ((inviteFormData.name || '').trim().length >= 2) {
                          setShowNameSuggestions(true);
                        }
                      }}
                      onChange={(e) => {
                        const cleaned = sanitizeName(e.target.value)
                        setInviteFormData({ ...inviteFormData, name: cleaned });
                        setShowNameSuggestions(true);
                      }}
                      onKeyDown={preventLeadingSpace}
                      required
                    />
                  {showNameSuggestions && (
                    <div className="name-suggestions">
                      {nameSearchLoading ? (
                        <div className="name-suggestion empty">Searching users...</div>
                      ) : nameSearchResults.length > 0 ? (
                        nameSearchResults.map((userOption) => (
                          <button
                            key={userOption?.id || userOption?.email || userOption?.name}
                            type="button"
                            className="name-suggestion"
                            onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                const email = sanitizeEmail(userOption?.email || '').trim().toLowerCase();
                                const selectedName = sanitizeName(userOption?.name || inviteFormData.name || '');
                                const dbRole = (userOption?.role || '').trim();
                                setInviteFormData((prev) => ({
                                  ...prev,
                                  name: selectedName || prev.name,
                                  email,
                                  role: dbRole
                                }));
                                if (email) {
                                  setEmailVerificationStatus('verified');
                                  setVerifiedEmailUser(userOption);
                                }
                                setShowNameSuggestions(false);
                            }}
                          >
                            <span className="name-suggestion-title">{userOption?.name || 'User'}</span>
                            <span className="name-suggestion-sub">{userOption?.email || ''}</span>
                          </button>
                        ))
                      ) : (
                        <div className="name-suggestion empty">No users found</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="email">Email * 
                  {emailVerificationStatus === 'verified' && (
                    <span className="verification-status verified" style={{marginLeft: '8px', fontSize: '0.85em'}}>
                      <FiCheck size={14} style={{display: 'inline', marginRight: '4px'}} /> Verified
                    </span>
                  )}
                  {emailVerificationStatus === 'not-found' && (
                    <span className="verification-status not-found" style={{marginLeft: '8px', fontSize: '0.85em', color: '#dc2626'}}>
                      ✗ Not Found
                    </span>
                  )}
                  {emailVerificationStatus === 'error' && (
                    <span className="verification-status error" style={{marginLeft: '8px', fontSize: '0.85em', color: '#dc2626'}}>
                      ✗ Error
                    </span>
                  )}
                </label>
                <div style={{display: 'flex', gap: '8px', marginBottom: '8px'}}>
                  <input
                    id="email"
                    type="email"
                    placeholder="Enter member email"
                      value={inviteFormData.email}
                      onChange={(e) => {
                        setInviteFormData({
                          ...inviteFormData,
                          email: sanitizeEmail(e.target.value),
                          role: ''
                        });
                        setEmailVerificationStatus(null);
                        setVerifiedEmailUser(null);
                      }}
                    onKeyDown={preventLeadingSpace}
                    required
                    style={{flex: 1}}
                  />
                  <button
                    type="button"
                    className={`verify-btn verify-btn-${emailVerificationStatus || 'default'}`}
                    onClick={verifyEmailAddress}
                    disabled={!inviteFormData.email || emailVerificationStatus === 'verifying'}
                    title="Verify email address in database"
                  >
                    {emailVerificationStatus === 'verifying' ? (
                      <>
                        <FiRepeat size={16} style={{display: 'inline', marginRight: '4px', animation: 'spin 1s linear infinite'}} />
                        Verifying...
                      </>
                    ) : emailVerificationStatus === 'verified' ? (
                      <>
                        <FiCheck size={16} style={{display: 'inline', marginRight: '4px'}} />
                        Verified
                      </>
                    ) : (
                      <>
                        Verify
                      </>
                    )}
                  </button>
                </div>
                {verifiedEmailUser && emailVerificationStatus === 'verified' && (
                  <div style={{fontSize: '0.85em', color: '#059669', marginTop: '4px', padding: '8px', backgroundColor: 'rgba(5, 150, 105, 0.1)', borderRadius: '4px'}}>
                    Found: {verifiedEmailUser.name || verifiedEmailUser.email}
                  </div>
                )}
              </div>

                <div className="form-group">
                  <label htmlFor="role">Role *</label>
                  <select
                    id="role"
                    value={inviteFormData.role}
                    disabled
                  >
                    {inviteFormData.role ? (
                      <option value={inviteFormData.role}>{getRoleLabel(inviteFormData.role)}</option>
                    ) : (
                      <option value="">Role will be set after verification</option>
                    )}
                  </select>
                </div>

              <div className="form-group">
                <label htmlFor="project">Project</label>
                <select
                  id="project"
                  value={inviteFormData.projectId}
                  onChange={(e) => setInviteFormData({ ...inviteFormData, projectId: e.target.value })}
                >
                  <option value="">Select project (optional)</option>
                  {projects.length === 0 ? (
                    <option value="" disabled>
                      {projectsLoading ? 'Loading projects...' : 'No projects available'}
                    </option>
                  ) : (
                    projects.map((project) => (
                      <option key={project?.id || getProjectId(project)} value={project?.id || getProjectId(project)}>
                        {project?.name || 'Untitled Project'} {project?.projectKey ? `(${project.projectKey})` : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>

                <div className="modal-footer">
                  <button 
                    type="button"
                    className="btn-cancel"
                    onClick={closeInviteModal}
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

      {showMemberModal && selectedMember && (
        <div className="modal-overlay" onClick={handleCloseMemberModal}>
          <div className="modal-content member-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Member Details</h2>
              <button 
                className="modal-close"
                onClick={handleCloseMemberModal}
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="member-detail-body">
              <div className="member-detail-profile">
                <img
                  src={getTeamAvatar(selectedMember.image || selectedMember.avatar)}
                  alt={selectedMember.name}
                />
                <div className="member-detail-info">
                  <div className="member-detail-name-row">
                    <h3>{selectedMember.name}</h3>
                    <span className={`role ${selectedMember.role.toLowerCase()}`}>
                      {getRoleLabel(selectedMember.role)}
                    </span>
                  </div>
                  <p className="member-detail-email">{selectedMember.email}</p>
                </div>
              </div>

              <div className="member-detail-stats">
                {isProjectFilterActive ? (
                  <div className="member-detail-stat">
                    <strong>{selectedProjectIsCompleted ? 'Completed' : 'Active'}</strong>
                    <span>Project Status</span>
                  </div>
                ) : (
                  <>
                    <div className="member-detail-stat">
                      <strong>{selectedMember.projects || 0}</strong>
                      <span>Active Projects</span>
                    </div>
                    <div className="member-detail-stat">
                      <strong>{selectedMember.completedProjects || 0}</strong>
                      <span>Completed Projects</span>
                    </div>
                  </>
                )}
                <div className="member-detail-stat">
                  <strong>{selectedMember.activeIssues || 0}</strong>
                  <span>Active Issues</span>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                type="button"
                className="btn-cancel"
                onClick={handleCloseMemberModal}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
