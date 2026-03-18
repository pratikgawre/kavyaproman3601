package com.team1.backend.model;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "issues")
public class Issue {

    @Id
    private String id;

    private String creatorName;
    private String creatorEmail;

    private String project;
    private String issueType;
    private String epicName;
    private String summary;

    private String description;

    // Board fields
    private String issueKey;
    private String status; // todo, progress, review, done
    private String priority; // low, medium, high, critical
    private Integer points;
    private String assigneeName;
    private String assigneeEmail;
    private String assignDate;
    private String deadlineDate;
    private List<String> labels;

    // attachments stored as JSON string (array of objects with name,type,url,publicId,resourceType,etc.)
    private String attachmentsJson;

    private String difficulty;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public Issue() {}

    // getters and setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getCreatorName() { return creatorName; }
    public void setCreatorName(String creatorName) { this.creatorName = creatorName; }

    public String getCreatorEmail() { return creatorEmail; }
    public void setCreatorEmail(String creatorEmail) { this.creatorEmail = creatorEmail; }

    public String getProject() { return project; }
    public void setProject(String project) { this.project = project; }

    public String getIssueType() { return issueType; }
    public void setIssueType(String issueType) { this.issueType = issueType; }

    public String getEpicName() { return epicName; }
    public void setEpicName(String epicName) { this.epicName = epicName; }

    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getIssueKey() { return issueKey; }
    public void setIssueKey(String issueKey) { this.issueKey = issueKey; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }

    public Integer getPoints() { return points; }
    public void setPoints(Integer points) { this.points = points; }

    public String getAssigneeName() { return assigneeName; }
    public void setAssigneeName(String assigneeName) { this.assigneeName = assigneeName; }

    public String getAssigneeEmail() { return assigneeEmail; }
    public void setAssigneeEmail(String assigneeEmail) { this.assigneeEmail = assigneeEmail; }

    public String getAssignDate() { return assignDate; }
    public void setAssignDate(String assignDate) { this.assignDate = assignDate; }

    public String getDeadlineDate() { return deadlineDate; }
    public void setDeadlineDate(String deadlineDate) { this.deadlineDate = deadlineDate; }

    public List<String> getLabels() { return labels; }
    public void setLabels(List<String> labels) { this.labels = labels; }

    public String getAttachmentsJson() { return attachmentsJson; }
    public void setAttachmentsJson(String attachmentsJson) { this.attachmentsJson = attachmentsJson; }

    public String getDifficulty() { return difficulty; }
    public void setDifficulty(String difficulty) { this.difficulty = difficulty; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
