package com.team1.backend.controller;

import com.team1.backend.dto.AdminDashboardResponse;
import com.team1.backend.dto.ManagerTeamDto;
import com.team1.backend.dto.PendingRequestActionRequest;
import com.team1.backend.dto.PendingRequestActionResponse;
import com.team1.backend.dto.PendingRequestResponse;
import com.team1.backend.model.User;
import com.team1.backend.repository.UserRepository;
import com.team1.backend.service.AdminDashboardService;
import com.team1.backend.service.ProjectService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
@RestController
@RequestMapping("/api/admin")
public class AdminDashboardController {

    private final AdminDashboardService adminDashboardService;
    private final UserRepository userRepository;
    private final ProjectService projectService;

    public AdminDashboardController(AdminDashboardService adminDashboardService,
                                     UserRepository userRepository,
                                     ProjectService projectService) {
        this.adminDashboardService = adminDashboardService;
        this.userRepository = userRepository;
        this.projectService = projectService;
    }

    @GetMapping("/dashboard")
    public ResponseEntity<AdminDashboardResponse> getDashboard(@RequestHeader("X-USER-ID") String userId) {
        if (userId == null || userId.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing X-USER-ID");
        }
        User user = userRepository.findById(userId.trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
        if (!hasAdminRole(user)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access required");
        }
        return ResponseEntity.ok(adminDashboardService.getOverview());
    }

    @GetMapping("/manager-teams")
    public ResponseEntity<List<ManagerTeamDto>> getManagerTeams(@RequestHeader("X-USER-ID") String userId) {
        if (userId == null || userId.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing X-USER-ID");
        }
        User user = userRepository.findById(userId.trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
        if (!hasAdminRole(user)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access required");
        }
        return ResponseEntity.ok(adminDashboardService.listManagerTeams());
    }

    @GetMapping("/pending-requests")
    public ResponseEntity<PendingRequestResponse> getPendingRequests(@RequestHeader("X-USER-ID") String userId) {
        if (userId == null || userId.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing X-USER-ID");
        }
        User user = userRepository.findById(userId.trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
        if (!hasAdminRole(user)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access required");
        }
        return ResponseEntity.ok(adminDashboardService.listPendingRequests());
    }

    @PostMapping("/pending-requests/{type}")
    public ResponseEntity<PendingRequestActionResponse> handlePendingAction(
            @PathVariable String type,
            @RequestBody PendingRequestActionRequest request,
            @RequestHeader("X-USER-ID") String userId
    ) {
        validateAdmin(userId);
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Request body is required");
        }
        String normalizedType = type == null ? "" : type.trim().toLowerCase();
        String action = normalizeAction(request.getAction());
        String message;
        switch (normalizedType) {
            case "join":
            case "role":
                try {
                    projectService.updateProjectMemberStatus(request.getProjectId(), request.getMemberEmail(), action)
                            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Member not found"));
                } catch (IllegalArgumentException ex) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage());
                }
                message = String.format("%s request for %s %s", type, request.getMemberEmail(), action);
                break;
            case "project":
                String projectLabel;
                try {
                    projectLabel = projectService.getProjectById(request.getProjectId()).getName();
                } catch (RuntimeException ex) {
                    throw new ResponseStatusException(HttpStatus.NOT_FOUND, ex.getMessage());
                }
                if (projectLabel == null || projectLabel.trim().isEmpty()) {
                    projectLabel = request.getProjectId();
                }
                message = String.format("Project %s marked as %s", projectLabel, action);
                break;
            default:
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown request type");
        }
        return ResponseEntity.ok(new PendingRequestActionResponse(message));
    }

    private String normalizeAction(String action) {
        if (action == null) {
            return "pending";
        }
        action = action.trim().toLowerCase();
        if ("approve".equals(action) || "approved".equals(action)) return "approved";
        if ("reject".equals(action) || "rejected".equals(action)) return "rejected";
        return action;
    }

    private boolean hasAdminRole(User user) {
        if (user == null || user.getRole() == null) {
            return false;
        }
        return "admin".equalsIgnoreCase(user.getRole().trim());
    }

    private void validateAdmin(String userId) {
        if (userId == null || userId.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing X-USER-ID");
        }
        User user = userRepository.findById(userId.trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
        if (!hasAdminRole(user)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access required");
        }
    }
}
