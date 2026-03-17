import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import './Auth.css'
import { useAuth } from '../context/AuthContext'
import { API_ENDPOINTS } from '../config/api'


function OrganizationPage() {
  const navigate = useNavigate();
  const { clearUser, user } = useAuth()
  const seedOrganizations = [
    {
      id: 1,
      name: "Kavya Technologies",
      username: "kavya-tech",
      description:
        "Leading software development company specializing in project management solutions",
      members: 4,
      projects: 3,
      role: "OWNER",
    },
    {
      id: 2,
      name: "Innovation Labs",
      username: "innovation-labs",
      description: "Research and development focused organization",
      members: 3,
      projects: 0,
      role: "ADMIN",
    },
  ];

  const [organizations, setOrganizations] = useState(seedOrganizations);

  const getNumericCount = (value) => {
    if (Array.isArray(value)) return value.length;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const getMemberCount = (org) =>
    getNumericCount(org.members ?? org.memberCount ?? org.membersCount ?? org.memberList);

  const getProjectCount = (org) =>
    getNumericCount(org.projects ?? org.projectCount ?? org.projectsCount ?? org.projectList);

  const normalizeOrganizations = (list) => {
    if (!Array.isArray(list)) return seedOrganizations;
    if (list.length === 0) return seedOrganizations;
    return list;
  };

  const openOrganization = (org) => {
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

  useEffect(() => {
    if (!user?.id) return;
    const controller = new AbortController();
    const loadOrganizations = async () => {
      try {
        const res = await fetch(API_ENDPOINTS.GET_ORGANIZATIONS, {
          headers: { 'X-USER-ID': String(user.id) },
          signal: controller.signal,
        });
        if (!res.ok) throw new Error('Failed to load organizations');
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setOrganizations(normalizeOrganizations(list));
      } catch (error) {
        if (error?.name !== 'AbortError') {
          setOrganizations(seedOrganizations);
        }
      } finally {
        // no-op
      }
    };
    loadOrganizations();
    return () => controller.abort();
  }, [user?.id]);

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
        />
      </div>

      {/* Organization Cards */}
      <div className="org-list-cards">
        {organizations.map((org) => (
          <div
            key={org.id}
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
                  {org.name.charAt(0)}
                </div>
                <div className="org-list-title-wrap">
                  <div className="org-list-name">
                    <h3>{org.name}</h3>
                    {org.role === 'OWNER' && (
                      <span className="org-list-crown" aria-hidden="true">
                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                          <path d="M3 8l4 4 5-7 5 7 4-4v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z" />
                        </svg>
                      </span>
                    )}
                  </div>
                  <p className="org-list-username">{org.username || org.slug || ''}</p>
                </div>
              </div>
              <button
                className="org-card-arrow"
                type="button"
                aria-label={`Open ${org.name}`}
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

            <p className="org-list-description">
              {org.description}
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
              <span className="org-list-role">{org.role}</span>
            </div>
          </div>
        ))}
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
