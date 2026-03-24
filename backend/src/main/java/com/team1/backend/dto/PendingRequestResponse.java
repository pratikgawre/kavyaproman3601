package com.team1.backend.dto;

import java.util.ArrayList;
import java.util.List;

public class PendingRequestResponse {

    private List<AdminPendingApprovalDto> joinRequests = new ArrayList<>();
    private List<AdminPendingApprovalDto> roleChangeRequests = new ArrayList<>();
    private List<ProjectCreationRequestDto> projectRequests = new ArrayList<>();

    public PendingRequestResponse() {}

    public List<AdminPendingApprovalDto> getJoinRequests() {
        return joinRequests;
    }

    public void setJoinRequests(List<AdminPendingApprovalDto> joinRequests) {
        this.joinRequests = joinRequests;
    }

    public List<AdminPendingApprovalDto> getRoleChangeRequests() {
        return roleChangeRequests;
    }

    public void setRoleChangeRequests(List<AdminPendingApprovalDto> roleChangeRequests) {
        this.roleChangeRequests = roleChangeRequests;
    }

    public List<ProjectCreationRequestDto> getProjectRequests() {
        return projectRequests;
    }

    public void setProjectRequests(List<ProjectCreationRequestDto> projectRequests) {
        this.projectRequests = projectRequests;
    }
}
