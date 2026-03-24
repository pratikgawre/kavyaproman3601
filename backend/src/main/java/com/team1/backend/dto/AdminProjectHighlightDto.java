package com.team1.backend.dto;

public class AdminProjectHighlightDto {

    private String projectId;
    private String projectKey;
    private String name;
    private String status;
    private String managerName;
    private String leadName;
    private int completionPct;
    private long totalIssues;
    private long completedIssues;
    private long activeIssues;

    public AdminProjectHighlightDto() {
    }

    public AdminProjectHighlightDto(
            String projectId,
            String projectKey,
            String name,
            String status,
            String managerName,
            String leadName,
            int completionPct,
            long totalIssues,
            long completedIssues,
            long activeIssues
    ) {
        this.projectId = projectId;
        this.projectKey = projectKey;
        this.name = name;
        this.status = status;
        this.managerName = managerName;
        this.leadName = leadName;
        this.completionPct = completionPct;
        this.totalIssues = totalIssues;
        this.completedIssues = completedIssues;
        this.activeIssues = activeIssues;
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

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getManagerName() {
        return managerName;
    }

    public void setManagerName(String managerName) {
        this.managerName = managerName;
    }

    public String getLeadName() {
        return leadName;
    }

    public void setLeadName(String leadName) {
        this.leadName = leadName;
    }

    public int getCompletionPct() {
        return completionPct;
    }

    public void setCompletionPct(int completionPct) {
        this.completionPct = completionPct;
    }

    public long getTotalIssues() {
        return totalIssues;
    }

    public void setTotalIssues(long totalIssues) {
        this.totalIssues = totalIssues;
    }

    public long getCompletedIssues() {
        return completedIssues;
    }

    public void setCompletedIssues(long completedIssues) {
        this.completedIssues = completedIssues;
    }

    public long getActiveIssues() {
        return activeIssues;
    }

    public void setActiveIssues(long activeIssues) {
        this.activeIssues = activeIssues;
    }
}
