package com.team1.backend.dto;

public class NotificationPreferencesDto {

    private boolean emailNotifications = true;
    private boolean issueAssignments = true;
    private boolean mentions = true;
    private boolean comments = false;
    private boolean statusChanges = true;
    private boolean weeklySummary = true;

    public NotificationPreferencesDto() {}

    public NotificationPreferencesDto(
            boolean emailNotifications,
            boolean issueAssignments,
            boolean mentions,
            boolean comments,
            boolean statusChanges,
            boolean weeklySummary
    ) {
        this.emailNotifications = emailNotifications;
        this.issueAssignments = issueAssignments;
        this.mentions = mentions;
        this.comments = comments;
        this.statusChanges = statusChanges;
        this.weeklySummary = weeklySummary;
    }

    public boolean isEmailNotifications() {
        return emailNotifications;
    }

    public void setEmailNotifications(boolean emailNotifications) {
        this.emailNotifications = emailNotifications;
    }

    public boolean isIssueAssignments() {
        return issueAssignments;
    }

    public void setIssueAssignments(boolean issueAssignments) {
        this.issueAssignments = issueAssignments;
    }

    public boolean isMentions() {
        return mentions;
    }

    public void setMentions(boolean mentions) {
        this.mentions = mentions;
    }

    public boolean isComments() {
        return comments;
    }

    public void setComments(boolean comments) {
        this.comments = comments;
    }

    public boolean isStatusChanges() {
        return statusChanges;
    }

    public void setStatusChanges(boolean statusChanges) {
        this.statusChanges = statusChanges;
    }

    public boolean isWeeklySummary() {
        return weeklySummary;
    }

    public void setWeeklySummary(boolean weeklySummary) {
        this.weeklySummary = weeklySummary;
    }
}
