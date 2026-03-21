package com.team1.backend.model;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

@CompoundIndexes({
        @CompoundIndex(name = "project_sprint_name_unique", def = "{'projectKey': 1, 'name': 1}", unique = true)
})
@Document(collection = "sprints")
public class Sprint {

    @Id
    private String id;

    private String projectKey;
    private String name;
    private String goal;
    private String status; // planned, active, completed
    private String startDate;
    private String endDate;
    private Integer order;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Transient
    private Integer issueCount;

    @Transient
    private List<SprintIssueInfo> issueSummary;

    @Transient
    private Map<String, Integer> issueStatusCounts;

    @Transient
    private Map<String, Integer> assigneeCounts;

    public Sprint() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getProjectKey() { return projectKey; }
    public void setProjectKey(String projectKey) { this.projectKey = projectKey; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getGoal() { return goal; }
    public void setGoal(String goal) { this.goal = goal; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getStartDate() { return startDate; }
    public void setStartDate(String startDate) { this.startDate = startDate; }

    public String getEndDate() { return endDate; }
    public void setEndDate(String endDate) { this.endDate = endDate; }

    public Integer getOrder() { return order; }
    public void setOrder(Integer order) { this.order = order; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public Integer getIssueCount() { return issueCount; }
    public void setIssueCount(Integer issueCount) { this.issueCount = issueCount; }

    public List<SprintIssueInfo> getIssueSummary() { return issueSummary; }
    public void setIssueSummary(List<SprintIssueInfo> issueSummary) { this.issueSummary = issueSummary; }

    public Map<String, Integer> getIssueStatusCounts() { return issueStatusCounts; }
    public void setIssueStatusCounts(Map<String, Integer> issueStatusCounts) { this.issueStatusCounts = issueStatusCounts; }

    public Map<String, Integer> getAssigneeCounts() { return assigneeCounts; }
    public void setAssigneeCounts(Map<String, Integer> assigneeCounts) { this.assigneeCounts = assigneeCounts; }

    public static class SprintIssueInfo {
        private String issueId;
        private String issueKey;
        private String status;
        private String assigneeName;
        private String assigneeEmail;

        public SprintIssueInfo() {}

        public String getIssueId() { return issueId; }
        public void setIssueId(String issueId) { this.issueId = issueId; }

        public String getIssueKey() { return issueKey; }
        public void setIssueKey(String issueKey) { this.issueKey = issueKey; }

        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }

        public String getAssigneeName() { return assigneeName; }
        public void setAssigneeName(String assigneeName) { this.assigneeName = assigneeName; }

        public String getAssigneeEmail() { return assigneeEmail; }
        public void setAssigneeEmail(String assigneeEmail) { this.assigneeEmail = assigneeEmail; }
    }
}
