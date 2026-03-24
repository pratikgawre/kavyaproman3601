package com.team1.backend.dto;

import java.time.LocalDateTime;

public class ProjectCreationRequestDto {

    private String projectId;
    private String projectKey;
    private String projectName;
    private String managerEmail;
    private String managerName;
    private LocalDateTime createdAt;

    public ProjectCreationRequestDto() {}

    public ProjectCreationRequestDto(String projectId,
                                     String projectKey,
                                     String projectName,
                                     String managerEmail,
                                     String managerName,
                                     LocalDateTime createdAt) {
        this.projectId = projectId;
        this.projectKey = projectKey;
        this.projectName = projectName;
        this.managerEmail = managerEmail;
        this.managerName = managerName;
        this.createdAt = createdAt;
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

    public String getManagerEmail() {
        return managerEmail;
    }

    public void setManagerEmail(String managerEmail) {
        this.managerEmail = managerEmail;
    }

    public String getManagerName() {
        return managerName;
    }

    public void setManagerName(String managerName) {
        this.managerName = managerName;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
