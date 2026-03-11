import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function CreateOrganization() {
  const navigate = useNavigate();
  const [orgName, setOrgName] = useState("");
  const [slug, setSlug] = useState("");
  const [desc, setDesc] = useState("");
  const [showError, setShowError] = useState(false);

  const generateSlug = (value) => {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
};
  return (
    <div className="org-page">
      <div className="org-container">

      
        <div className="org-back" onClick={() => navigate("/organization")}>
          ← Back to Organizations
        </div>

        <h2 className="org-title">Create Organization</h2>
        <p className="org-subtitle">
          Set up your workspace in just a few steps
        </p>

   
        <div className="org-steps">
          <span className="org-step active">1 Basic Info</span>
          <span className="org-step active">2 Customize</span>
        </div>

      
        <div className="org-card">

          <h3>Organization Details</h3>
          <p className="org-subtitle">
            Tell us about your organization
          </p>

       
          <label>Organization Name *</label>
          <input
            type="text"
            placeholder="e.g. Acme Corporation"
            value={orgName}
            onChange={(e) => {
  const value = e.target.value;
  setOrgName(value);

 
  setSlug(generateSlug(value));
}}
          />
          {!orgName && showError && (
            <p className="org-error">Organization name is required</p>
          )}

        
          <label>URL Slug *</label>
          <div className="org-url">
            <span>kavyaproman.com/</span>
            <input
              type="text"
              placeholder="acme-corp"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
          </div>
          {!slug && showError && (
            <p className="org-error">URL slug is required</p>
          )}

       
          <label>Description</label>
          <textarea
            placeholder="Brief description of your organization..."
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />

       
          <div className="org-buttons">
            <button
              className="org-cancel"
             onClick={() => {
                if (!orgName || !slug) {
                  setShowError(true);
                  return;
                }
                navigate("/organization");
              }}
            >
              Cancel
            </button>

            <button
              className="org-continue"
               onClick={() => {
                if (!orgName || !slug) {
                  setShowError(true);
                  return;
                }
               navigate("/customize", {
  state: { orgName, slug, desc }
});
              }}
            >
            
              Continue
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

export default CreateOrganization;
