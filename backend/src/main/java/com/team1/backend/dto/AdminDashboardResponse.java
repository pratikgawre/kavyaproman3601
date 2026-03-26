package com.team1.backend.dto;

import java.util.List;

public class AdminDashboardResponse {

    private long totalUsers;
    private long activeProjects;
    private long completedProjects;
    private long onHoldProjects;
    private long totalTeams;
    private long pendingRequests;
    private List<AdminProjectStatusDto> projectOverview;
    private List<AdminProjectHighlightDto> projectHighlights;
    private List<AdminPendingApprovalDto> pendingApprovals;
    private List<String> systemNotifications;
    private List<String> announcements;

    public AdminDashboardResponse() {
    }

    public long getTotalUsers() {
        return totalUsers;
    }

    public void setTotalUsers(long totalUsers) {
        this.totalUsers = totalUsers;
    }

    public long getActiveProjects() {
        return activeProjects;
    }

    public void setActiveProjects(long activeProjects) {
        this.activeProjects = activeProjects;
    }

    public long getCompletedProjects() {
        return completedProjects;
    }

    public void setCompletedProjects(long completedProjects) {
        this.completedProjects = completedProjects;
    }

    public long getOnHoldProjects() {
        return onHoldProjects;
    }

    public void setOnHoldProjects(long onHoldProjects) {
        this.onHoldProjects = onHoldProjects;
    }

    public long getTotalTeams() {
        return totalTeams;
    }

    public void setTotalTeams(long totalTeams) {
        this.totalTeams = totalTeams;
    }

    public long getPendingRequests() {
        return pendingRequests;
    }

    public void setPendingRequests(long pendingRequests) {
        this.pendingRequests = pendingRequests;
    }

    public List<AdminProjectStatusDto> getProjectOverview() {
        return projectOverview;
    }

    public void setProjectOverview(List<AdminProjectStatusDto> projectOverview) {
        this.projectOverview = projectOverview;
    }

    public List<AdminProjectHighlightDto> getProjectHighlights() {
        return projectHighlights;
    }

    public void setProjectHighlights(List<AdminProjectHighlightDto> projectHighlights) {
        this.projectHighlights = projectHighlights;
    }

    public List<AdminPendingApprovalDto> getPendingApprovals() {
        return pendingApprovals;
    }

    public void setPendingApprovals(List<AdminPendingApprovalDto> pendingApprovals) {
        this.pendingApprovals = pendingApprovals;
    }

    public List<String> getSystemNotifications() {
        return systemNotifications;
    }

    public void setSystemNotifications(List<String> systemNotifications) {
        this.systemNotifications = systemNotifications;
    }

    public List<String> getAnnouncements() {
        return announcements;
    }

    public void setAnnouncements(List<String> announcements) {
        this.announcements = announcements;
    }
}
