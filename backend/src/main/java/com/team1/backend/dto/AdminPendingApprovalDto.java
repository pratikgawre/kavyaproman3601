package com.team1.backend.dto;

public class AdminPendingApprovalDto {

    private String projectId;
    private String projectKey;
    private String projectName;
    private String memberName;
    private String memberEmail;
    private String status;

    public AdminPendingApprovalDto() {
    }

    public AdminPendingApprovalDto(
            String projectId,
            String projectKey,
            String projectName,
            String memberName,
            String memberEmail,
            String status
    ) {
        this.projectId = projectId;
        this.projectKey = projectKey;
        this.projectName = projectName;
        this.memberName = memberName;
        this.memberEmail = memberEmail;
        this.status = status;
    }

    public String getProjectId() {
        return projectId;
    }

    public void setProjectId(String projectId) {
        this.projectId = projectId;
    }

    public String getProjectKey() {
        return projectKey;
    }

    public void setProjectKey(String projectKey) {
        this.projectKey = projectKey;
    }

    public String getProjectName() {
        return projectName;
    }

    public void setProjectName(String projectName) {
        this.projectName = projectName;
    }

    public String getMemberName() {
        return memberName;
    }

    public void setMemberName(String memberName) {
        this.memberName = memberName;
    }

    public String getMemberEmail() {
        return memberEmail;
    }

    public void setMemberEmail(String memberEmail) {
        this.memberEmail = memberEmail;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
