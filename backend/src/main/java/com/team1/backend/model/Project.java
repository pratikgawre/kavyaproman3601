package com.team1.backend.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

@CompoundIndexes({
        @CompoundIndex(name = "manager_projectkey_unique", def = "{'managerEmail': 1, 'projectKey': 1}", unique = true)
})
@Document(collection = "projects")
public class Project {

    @Id
    private String id;

    private String projectKey;

    private String name;

    private String description;

    private String icon;

    private String projectType;

    @JsonProperty("isArchived")
    private Boolean archived = false;

    private String teamLead;

    private String managerEmail;

    private String organizationId;

    private String organizationUsername;

    private String organizationName;

    private List<ProjectMember> teamMembers;

    private Integer totalIssues = 0;

    private Integer completedIssues = 0;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    public Project() {}

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getProjectKey() {
        return projectKey;
    }

    public void setProjectKey(String projectKey) {
        this.projectKey = projectKey;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getIcon() {
        return icon;
    }

    public void setIcon(String icon) {
        this.icon = icon;
    }

    public String getProjectType() {
        return projectType;
    }

    public void setProjectType(String projectType) {
        this.projectType = projectType;
    }

    public Boolean getIsArchived() {
        return archived;
    }

    public void setIsArchived(Boolean archived) {
        this.archived = archived;
    }

    public String getTeamLead() {
        return teamLead;
    }

    public void setTeamLead(String teamLead) {
        this.teamLead = teamLead;
    }

    public String getManagerEmail() {
        return managerEmail;
    }

    public void setManagerEmail(String managerEmail) {
        this.managerEmail = managerEmail;
    }

    public String getOrganizationId() {
        return organizationId;
    }

    public void setOrganizationId(String organizationId) {
        this.organizationId = organizationId;
    }

    public String getOrganizationUsername() {
        return organizationUsername;
    }

    public void setOrganizationUsername(String organizationUsername) {
        this.organizationUsername = organizationUsername;
    }

    public String getOrganizationName() {
        return organizationName;
    }

    public void setOrganizationName(String organizationName) {
        this.organizationName = organizationName;
    }

    public List<ProjectMember> getTeamMembers() {
        return teamMembers;
    }

    public void setTeamMembers(List<ProjectMember> teamMembers) {
        this.teamMembers = teamMembers;
    }

    public Integer getTotalIssues() {
        return totalIssues;
    }

    public void setTotalIssues(Integer totalIssues) {
        this.totalIssues = totalIssues;
    }

    public Integer getCompletedIssues() {
        return completedIssues;
    }

    public void setCompletedIssues(Integer completedIssues) {
        this.completedIssues = completedIssues;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
