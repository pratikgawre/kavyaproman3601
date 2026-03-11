import { useState } from "react";
import { useNavigate } from "react-router-dom";
import './Auth.css'
import { useAuth } from '../context/AuthContext'


function OrganizationPage() {
  const navigate = useNavigate();
  const { clearUser } = useAuth()
  const [organizations, setOrganizations] = useState([
    {
      id: 1,
      name: "Kavya Technologies",
      username: "kavya-tech",
      description:
        "Leading software development company specializing in project management solutions",
      members: 0,
      projects: 0,
      role: "OWNER",
    },
    {
      id: 2,
      name: "Innovation Labs",
      username: "innovation-labs",
      description: "Research and development focused organization",
      members: 0,
      projects: 0,
      role: "ADMIN",
    },
  ]);

  // Create Organization
  const createOrganization = () => {
    const name = prompt("Enter organization name:");
    if (!name) return;

    const newOrg = {
      id: Date.now(),
      name: name,
      username: name.toLowerCase().replace(/\s+/g, "-"),
      description: "New organization description",
      members: 0,
      projects: 0,
      role: "OWNER",
    };

    setOrganizations((prev) => [...prev, newOrg]);
  };

  return (
    <div className="org-list-container">
      
      {/* Header */}
      <div className="org-list-header">
        <h1 className="org-list-title">KavyaProMan 300</h1>
      </div>

      {/* Subtitle */}
      <p className="org-list-subtitle">
        Select an organization to continue
      </p>
      <button className="org-list-logout" onClick={() => {
        // permanently clear session and selected org, then go to login
        clearUser()
        localStorage.removeItem('org')
        navigate('/login', { replace: true })
      }}>
        Logout
      </button>

      {/* Search */}
      <input
        type="text"
        placeholder="Search organizations..."
        className="org-search"
      />

      {/* Organization Cards */}
      <div className="org-list-cards">
        {organizations.map((org) => (
          <div key={org.id} className="org-list-card">
            <div className="org-list-card-header">
              <div className="org-list-icon">
                {org.name.charAt(0)}
              </div>
              <div>
                <h3>{org.name}</h3>
                <p className="username">@{org.username}</p>
              </div>
            </div>

            <p className="org-list-description">
              {org.description}
            </p>

            <div className="org-list-footer">
              <span className="org-list-role">{org.role}</span>
              <button
                className="org-list-btn"
                onClick={() => {
                  // store selected org so dashboard can pick it up
                  localStorage.setItem('org', JSON.stringify(org))
                  // notify other pages about the change
                  try {
                    window.dispatchEvent(new CustomEvent('org:changed', { detail: org }))
                  } catch (e) {
                    // ignore
                  }
                  navigate('/dashboard')
                }}
              >
                Open
              </button>
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

    </div>
  );
}

export default OrganizationPage;
