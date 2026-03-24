package com.team1.backend.dto;

import java.util.ArrayList;
import java.util.List;

public class ProjectTeamDto {

    private String projectId;
    private String projectName;
    private String projectKey;
    private List<ManagerTeamMemberDto> members = new ArrayList<>();

    public ProjectTeamDto() {}

    public ProjectTeamDto(String projectId, String projectName, String projectKey) {
        this.projectId = projectId;
        this.projectName = projectName;
        this.projectKey = projectKey;
    }

    public String getProjectId() {
        return projectId;
    }

    public void setProjectId(String projectId) {
        this.projectId = projectId;
    }

    public String getProjectName() {
        return projectName;
    }

    public void setProjectName(String projectName) {
        this.projectName = projectName;
    }

    public String getProjectKey() {
        return projectKey;
    }

    public void setProjectKey(String projectKey) {
        this.projectKey = projectKey;
    }

    public List<ManagerTeamMemberDto> getMembers() {
        return members;
    }

    public void setMembers(List<ManagerTeamMemberDto> members) {
        this.members = members;
    }
}
