import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Auth.css";
import { uploadFile } from "../utils/upload";
import { useAuth } from "../context/AuthContext";

function CustomizeOrganization() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080';

  const { orgName = "", slug = "", desc = "" } = location.state || {};

  const [logo, setLogo] = useState({ name: "", url: "" });
  const [logoUploading, setLogoUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setLogoUploading(true);
    try {
      const uploaded = await uploadFile(selectedFile, { folder: "organizations" });
      const url = uploaded?.url;
      if (!url) throw new Error("Upload did not return a URL");
      setLogo({ name: selectedFile.name, url });
    } catch (err) {
      alert(err.message || "Logo upload failed");
    } finally {
      setLogoUploading(false);
      e.target.value = "";
    }
  };

  const handleCreateOrganization = async () => {
    const safeName = (orgName || "").trim();
    const safeSlug = (slug || safeName || "new-org")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    if (!safeName) {
      setSubmitError("Organization name is required");
      return;
    }
    if (!safeSlug) {
      setSubmitError("URL slug is required");
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    const payload = {
      name: safeName,
      username: safeSlug,
      description: (desc || "").trim(),
      members: 0,
      projects: 0,
      role: "OWNER",
      logoUrl: logo.url || "",
    };

    const ownerEmail = (user?.email || "").trim().toLowerCase();
    if (ownerEmail) {
      payload.ownerEmail = ownerEmail;
    }

    try {
      const res = await fetch(`${API_BASE}/api/organizations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.message || "Failed to create organization");
      }
      alert("Organization Created!");
      navigate("/organization");
    } catch (err) {
      setSubmitError(err.message || "Failed to create organization");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="org-page">
      <div className="org-container">
        
        {/* Back */}
        <div className="org-back" onClick={() => navigate("/create")}>
          ← Back to Organizations
        </div>

        {/* Title */}
        <h2 className="org-title">Create Organization</h2>
        <p className="org-subtitle">
          Set up your workspace in just a few steps
        </p>

        {/* Steps */}
        <div className="org-steps">
          <span className="org-step done">✓ Basic Info</span>
          <span className="org-step active">2 Customize</span>
        </div>

        {/* Card */}
        <div className="org-card">
          <h3>Customize Your Workspace</h3>
          <p className="org-subtitle">
            Add a logo and complete your setup
          </p>

          {/* Upload */}
          <label>Organization Logo</label>

          <input
            type="file"
            id="fileUpload"
            style={{ display: "none" }}
            accept="image/png, image/jpeg, image/svg+xml"
            onChange={handleFileChange}
          />

          <label htmlFor="fileUpload" className="upload-box">
            <p>{logoUploading ? "Uploading..." : "Click to upload or drag and drop"}</p>
            <span>SVG, PNG, JPG (max 2MB)</span>
          </label>

          {/* Preview */}
          {logo.url && (
            <div style={{ marginTop: "10px", display: "flex", alignItems: "center", gap: "12px" }}>
              <img
                src={logo.url}
                alt="Organization logo"
                style={{ width: "48px", height: "48px", objectFit: "cover", borderRadius: "8px", border: "1px solid #e5e7eb" }}
              />
              <div>Uploaded: {logo.name}</div>
            </div>
          )}

          {/* Next Steps */}
          <div className="org-next">
            <h4>What's Next?</h4>
            <ul>
              <li>Invite team members</li>
              <li>Create your first project</li>
              <li>Set workflows</li>
              <li>Track issues & sprints</li>
            </ul>
          </div>

          {/* Summary */}
          <div className="org-summary">
            <h4>Summary</h4>

            <div className="summary-row">
              <span>Name:</span>
              <b>{orgName}</b>
            </div>

            <div className="summary-row">
              <span>URL:</span>
              <b>kavyaproman.com/{slug}</b>
            </div>

            <div className="summary-row">
              <span>Description:</span>
              <b>{desc}</b>
            </div>
          </div>

          {submitError && <p className="org-error">{submitError}</p>}

          {/* Buttons */}
          <div className="org-buttons">
            <button
              className="org-cancel"
              onClick={() => navigate("/create")}
            >
              ← Back
            </button>

            <button
              className="org-continue"
              onClick={handleCreateOrganization}
              disabled={logoUploading || submitting}
            >
              {submitting ? "Creating..." : "✓ Create Organization"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

export default CustomizeOrganization;


