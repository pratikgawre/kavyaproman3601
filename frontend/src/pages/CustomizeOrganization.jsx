import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Auth.css";

function CustomizeOrganization() {
  const navigate = useNavigate();
  const location = useLocation();

  const { orgName, slug, desc } = location.state || {};

  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    console.log("Selected file:", selectedFile);
    setFile(selectedFile);
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
            <p>⬆ Click to upload or drag and drop</p>
            <span>SVG, PNG, JPG (max 2MB)</span>
          </label>

          {/* Preview */}
          {file && (
            <p style={{ marginTop: "10px" }}>
              Selected: {file.name}
            </p>
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
              onClick={() => {
                alert("Organization Created!");
                navigate("/organization");
              }}
            >
              ✓ Create Organization
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

export default CustomizeOrganization;