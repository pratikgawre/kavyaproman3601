package com.team1.backend.dto;

import java.util.ArrayList;
import java.util.List;

public class ReportResponse {

    private Summary summary = new Summary();
    private List<VelocityPoint> velocityData = new ArrayList<>();
    private List<BurndownPoint> burndownData = new ArrayList<>();
    private List<IssueTypeDistributionPoint> issueTypeDistributionData = new ArrayList<>();
    private List<StatusDistributionPoint> statusDistributionData = new ArrayList<>();

    public Summary getSummary() {
        return summary;
    }

    public void setSummary(Summary summary) {
        this.summary = summary;
    }

    public List<VelocityPoint> getVelocityData() {
        return velocityData;
    }

    public void setVelocityData(List<VelocityPoint> velocityData) {
        this.velocityData = velocityData;
    }

    public List<BurndownPoint> getBurndownData() {
        return burndownData;
    }

    public void setBurndownData(List<BurndownPoint> burndownData) {
        this.burndownData = burndownData;
    }

    public List<IssueTypeDistributionPoint> getIssueTypeDistributionData() {
        return issueTypeDistributionData;
    }

    public void setIssueTypeDistributionData(List<IssueTypeDistributionPoint> issueTypeDistributionData) {
        this.issueTypeDistributionData = issueTypeDistributionData;
    }

    public List<StatusDistributionPoint> getStatusDistributionData() {
        return statusDistributionData;
    }

    public void setStatusDistributionData(List<StatusDistributionPoint> statusDistributionData) {
        this.statusDistributionData = statusDistributionData;
    }

    public static class Summary {
        private int totalIssues;
        private int completedIssues;
        private int completionRate;
        private int totalPoints;
        private int estimatedHours;
        private int loggedHours;

        public int getTotalIssues() {
            return totalIssues;
        }

        public void setTotalIssues(int totalIssues) {
            this.totalIssues = totalIssues;
        }

        public int getCompletedIssues() {
            return completedIssues;
        }

        public void setCompletedIssues(int completedIssues) {
            this.completedIssues = completedIssues;
        }

        public int getCompletionRate() {
            return completionRate;
        }

        public void setCompletionRate(int completionRate) {
            this.completionRate = completionRate;
        }

        public int getTotalPoints() {
            return totalPoints;
        }

        public void setTotalPoints(int totalPoints) {
            this.totalPoints = totalPoints;
        }

        public int getEstimatedHours() {
            return estimatedHours;
        }

        public void setEstimatedHours(int estimatedHours) {
            this.estimatedHours = estimatedHours;
        }

        public int getLoggedHours() {
            return loggedHours;
        }

        public void setLoggedHours(int loggedHours) {
            this.loggedHours = loggedHours;
        }
    }

    public static class VelocityPoint {
        private String period;
        private int points;

        public VelocityPoint() {}

        public VelocityPoint(String period, int points) {
            this.period = period;
            this.points = points;
        }

        public String getPeriod() {
            return period;
        }

        public void setPeriod(String period) {
            this.period = period;
        }

        public int getPoints() {
            return points;
        }

        public void setPoints(int points) {
            this.points = points;
        }
    }

    public static class BurndownPoint {
        private String day;
        private int remaining;

        public BurndownPoint() {}

        public BurndownPoint(String day, int remaining) {
            this.day = day;
            this.remaining = remaining;
        }

        public String getDay() {
            return day;
        }

        public void setDay(String day) {
            this.day = day;
        }

        public int getRemaining() {
            return remaining;
        }

        public void setRemaining(int remaining) {
            this.remaining = remaining;
        }
    }

    public static class IssueTypeDistributionPoint {
        private String type;
        private int value;

        public IssueTypeDistributionPoint() {}

        public IssueTypeDistributionPoint(String type, int value) {
            this.type = type;
            this.value = value;
        }

        public String getType() {
            return type;
        }

        public void setType(String type) {
            this.type = type;
        }

        public int getValue() {
            return value;
        }

        public void setValue(int value) {
            this.value = value;
        }
    }

    public static class StatusDistributionPoint {
        private String status;
        private int value;

        public StatusDistributionPoint() {}

        public StatusDistributionPoint(String status, int value) {
            this.status = status;
            this.value = value;
        }

        public String getStatus() {
            return status;
        }

        public void setStatus(String status) {
            this.status = status;
        }

        public int getValue() {
            return value;
        }

        public void setValue(int value) {
            this.value = value;
        }
    }
}
