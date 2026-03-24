package com.team1.backend.dto;

import java.util.ArrayList;
import java.util.List;

public class ManagerTeamDto {

    private String managerEmail;
    private String managerName;
    private List<ProjectTeamDto> projects = new ArrayList<>();

    public ManagerTeamDto() {}

    public ManagerTeamDto(String managerEmail, String managerName) {
        this.managerEmail = managerEmail;
        this.managerName = managerName;
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

    public List<ProjectTeamDto> getProjects() {
        return projects;
    }

    public void setProjects(List<ProjectTeamDto> projects) {
        this.projects = projects;
    }
}
