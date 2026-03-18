import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import './Auth.css'
import { useAuth } from '../context/AuthContext'


function OrganizationPage() {
  const navigate = useNavigate();
  const { clearUser, user } = useAuth()
  const API_BASE = (import.meta?.env?.VITE_API_BASE || 'http://localhost:8080')
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchText, setSearchText] = useState('');
  const [activeMenuOrgId, setActiveMenuOrgId] = useState(null);
  const [deletingOrgId, setDeletingOrgId] = useState(null);

  const ownerEmail = (user?.email || '').trim().toLowerCase()

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')

    const query = ownerEmail ? `?ownerEmail=${encodeURIComponent(ownerEmail)}` : ''

    fetch(`${API_BASE}/api/organizations${query}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          const errorText = await res.text()
          throw new Error(errorText || 'Failed to load organizations')
        }
        return res.json()
      })
      .then((data) => {
        setOrganizations(Array.isArray(data) ? data : [])
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setOrganizations([])
        setError(err.message || 'Failed to load organizations')
      })
      .finally(() => {
        setLoading(false)
      })

    return () => controller.abort()
  }, [API_BASE, ownerEmail])

  const filteredOrganizations = useMemo(() => {
    const query = searchText.trim().toLowerCase()
    if (!query) return organizations
    return (organizations || []).filter((org) => {
      const name = (org?.name || '').toLowerCase()
      const username = (org?.username || '').toLowerCase()
      const description = (org?.description || '').toLowerCase()
      return name.includes(query) || username.includes(query) || description.includes(query)
    })
  }, [organizations, searchText])

  const getNumericCount = (value) => {
    if (Array.isArray(value)) return value.length;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const getMemberCount = (org) =>
    getNumericCount(org.members ?? org.memberCount ?? org.memberList);

  const getProjectCount = (org) =>
    getNumericCount(org.projects ?? org.projectCount ?? org.projectList);

  const getOrgKey = (org) => {
    if (!org) return ''
    const candidate = org.id || org._id || org.username || org.name || ''
    return candidate.toString()
  }

  const openOrganization = (org) => {
    setActiveMenuOrgId(null)
    // store selected org so dashboard can pick it up
    localStorage.setItem('org', JSON.stringify(org))
    // notify other pages about the change
    try {
      window.dispatchEvent(new CustomEvent('org:changed', { detail: org }))
    } catch (e) {
      // ignore
    }
    navigate('/dashboard')
  }

  const toggleOrgMenu = (orgId, event) => {
    event.stopPropagation()
    setActiveMenuOrgId((prev) => (prev === orgId ? null : orgId))
  }

  const handleEditOrganization = (org) => {
    setActiveMenuOrgId(null)
    const editState = {
      orgName: org?.name || '',
      slug: org?.username || '',
      desc: org?.description || '',
      orgId: getOrgKey(org)
    }
    navigate('/customize', { state: editState })
  }

  const handleDeleteOrganization = async (org) => {
    setActiveMenuOrgId(null)
    const displayName = (org?.name || org?.username || 'this organization').trim()
    const confirmed = window.confirm(`Delete ${displayName}? This cannot be undone.`)
    if (!confirmed) return

    const organizationId = org?.id || org?._id
    if (!organizationId) {
      alert('Unable to identify the organization to delete.')
      return
    }

    try {
      setDeletingOrgId(getOrgKey(org))
      const response = await fetch(`${API_BASE}/api/organizations/${organizationId}`, {
        method: 'DELETE'
      })
      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        throw new Error(errorText || 'Failed to delete organization')
      }
      setOrganizations((prev) => (prev || []).filter((item) => getOrgKey(item) !== getOrgKey(org)))
    } catch (err) {
      console.error('Delete organization failed', err)
      alert(err.message || 'Failed to delete organization')
    } finally {
      setDeletingOrgId(null)
    }
  }

  return (
    <div className="org-list-container">
      
      {/* Header */}
      <div className="org-list-header">
        <div className="org-list-brand">
          <span className="org-list-logo" aria-hidden="true">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <rect x="4" y="3" width="12" height="18" rx="2" />
              <path d="M8 7h4M8 11h4M8 15h4" />
              <path d="M18 7h2a1 1 0 0 1 1 1v10a3 3 0 0 1-3 3H10" />
            </svg>
          </span>
          <h1 className="org-list-title">KavyaProMan 360</h1>
        </div>
        <button className="org-list-logout" onClick={() => {
          // permanently clear session and selected org, then go to login
          clearUser()
          localStorage.removeItem('org')
          navigate('/login', { replace: true })
        }}>
          <span className="org-logout-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M14 7V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-1" />
              <path d="M11 12h9" />
              <path d="m17 9 3 3-3 3" />
            </svg>
          </span>
          Logout
        </button>
      </div>

      {/* Subtitle */}
      <p className="org-list-subtitle">
        Select an organization to continue
      </p>
      {/* Search */}
      <div className="org-search-wrap">
        <span className="org-search-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </span>
        <input
          type="text"
          placeholder="Search organizations..."
          className="org-search"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
        />
      </div>

      {/* Organization Cards */}
      <div className="org-list-cards">
        {loading && (
          <div className="org-list-empty">Loading organizations...</div>
        )}
        {!loading && error && (
          <div className="org-list-empty">{error}</div>
        )}
        {!loading && !error && filteredOrganizations.length === 0 && (
          <div className="org-list-empty">No organizations yet. Create one to get started.</div>
        )}
        {!loading && !error && filteredOrganizations.map((org) => {
          const orgKey = getOrgKey(org);
          const displayName = (org?.name || org?.username || 'Organization').trim();
          const displayUsername = (org?.username || '').trim();
          const roleLabel = (org?.role || 'MEMBER').toUpperCase();
          const initial = displayName ? displayName.charAt(0).toUpperCase() : 'O';
          const isDeleting = deletingOrgId === orgKey;
          return (
          <div
            key={orgKey || `${displayName}-${displayUsername}`}
            className="org-list-card"
            role="button"
            tabIndex={0}
            onClick={() => openOrganization(org)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                openOrganization(org)
              }
            }}
          >
            <div className="org-list-card-top">
              <div className="org-list-card-header">
                <div className="org-list-icon">
                  {initial}
                </div>
                <div className="org-list-title-wrap">
                  <div className="org-list-name">
                    <h3>{displayName}</h3>
                    {roleLabel === 'OWNER' && (
                      <span className="org-list-crown" aria-hidden="true">
                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                          <path d="M3 8l4 4 5-7 5 7 4-4v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z" />
                        </svg>
                      </span>
                    )}
                  </div>
                  <p className="org-list-username">{displayUsername}</p>
                </div>
              </div>
              <div className="org-card-controls">
                <div className="org-card-actions">
                  <button
                    className="org-card-menu-button"
                    type="button"
                    onClick={(event) => toggleOrgMenu(orgKey, event)}
                    aria-haspopup="menu"
                    aria-expanded={activeMenuOrgId === orgKey}
                    aria-label={`Organization actions for ${displayName}`}
                  >
                    <span className="org-card-menu-icon" aria-hidden="true"></span>
                  </button>
                  {activeMenuOrgId === orgKey && (
                    <div className="org-card-menu-panel" onClick={(event) => event.stopPropagation()}>
                      <button type="button" onClick={() => handleEditOrganization(org)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="danger"
                        onClick={() => handleDeleteOrganization(org)}
                        disabled={isDeleting}
                        aria-busy={isDeleting || undefined}
                      >
                        {isDeleting ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  )}
                </div>
                <button
                  className="org-card-arrow"
                  type="button"
                  aria-label={`Open ${displayName}`}
                  onClick={(event) => {
                    event.stopPropagation()
                    openOrganization(org)
                  }}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </button>
              </div>
            </div>

            <p className="org-list-description">
              {org.description || 'No description added yet.'}
            </p>

            <div className="org-list-meta">
              <div className="org-list-stats">
                <span className="org-list-stat">
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <circle cx="8" cy="8" r="3.25" />
                    <path d="M2 19a6 6 0 0 1 12 0" />
                    <path d="M15 7h6" />
                    <path d="M18 4v6" />
                  </svg>
                  {getMemberCount(org)} members
                </span>
                <span className="org-list-stat">
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <rect x="4" y="4" width="7" height="7" rx="1.5" />
                    <rect x="13" y="4" width="7" height="7" rx="1.5" />
                    <rect x="4" y="13" width="7" height="7" rx="1.5" />
                    <rect x="13" y="13" width="7" height="7" rx="1.5" />
                  </svg>
                  {getProjectCount(org)} projects
                </span>
              </div>
              <span className="org-list-role">{roleLabel}</span>
            </div>
          </div>
        )})}
      </div>

      {/* Create Organization */}
      <div
        className="org-create-box"
        onClick={() => navigate("/create")}
      >
        <div className="org-create-circle">+</div>
        <h3>Create New Organization</h3>
        <p>
          Start managing your projects with a new workspace
        </p>
      </div>

      <div className="org-support">
        Need help?{" "}
        <button
          type="button"
          className="org-support-link"
          onClick={() => navigate("/contact-sales")}
        >
          Contact Support
        </button>
      </div>

    </div>
  );
}

export default OrganizationPage;
