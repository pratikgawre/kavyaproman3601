package com.team1.backend.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDateTime;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

@CompoundIndexes({
        @CompoundIndex(name = "email_manager_unique", def = "{'email': 1, 'managerEmail': 1}", unique = true)
})
@Document(collection = "members")
public class Member {

    @Id
    private String id;

    private String name;

    private String email;

    private String role;   // Admin, Developer, Tester

    private Integer projects = 0;

    @JsonProperty("activeIssues")
    private Integer activeIssues = 0;

    private String image;

    // Project manager who invited/owns this member
    private String managerEmail;

    private LocalDateTime createdAt;

    public Member() {}

    public Member(String id, String name, String email, String role, Integer projects, Integer activeIssues, String image, LocalDateTime createdAt) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.role = role;
        this.projects = projects;
        this.activeIssues = activeIssues;
        this.image = image;
        this.createdAt = createdAt;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public Integer getProjects() {
        return projects;
    }

    public void setProjects(Integer projects) {
        this.projects = projects;
    }

    public Integer getActiveIssues() {
        return activeIssues;
    }

    public void setActiveIssues(Integer activeIssues) {
        this.activeIssues = activeIssues;
    }

    public String getImage() {
        return image;
    }

    public void setImage(String image) {
        this.image = image;
    }

    public String getManagerEmail() {
        return managerEmail;
    }

    public void setManagerEmail(String managerEmail) {
        this.managerEmail = managerEmail;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
