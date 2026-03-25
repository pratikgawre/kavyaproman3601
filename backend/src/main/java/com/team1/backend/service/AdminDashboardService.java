package com.team1.backend.service;

import com.team1.backend.dto.AdminDashboardResponse;
import com.team1.backend.dto.AdminPendingApprovalDto;
import com.team1.backend.dto.AdminProjectHighlightDto;
import com.team1.backend.dto.AdminProjectStatusDto;
import com.team1.backend.dto.PendingRequestResponse;
import com.team1.backend.dto.ManagerTeamDto;
import com.team1.backend.dto.ProjectTeamDto;
import com.team1.backend.dto.ManagerTeamMemberDto;
import com.team1.backend.dto.ProjectCreationRequestDto;
import com.team1.backend.model.Project;
import com.team1.backend.model.ProjectMember;
import com.team1.backend.model.User;
import com.team1.backend.model.Notification;
import com.team1.backend.repository.ProjectRepository;
import com.team1.backend.repository.UserRepository;
import com.team1.backend.repository.NotificationRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.stream.Collectors;

@Service
public class AdminDashboardService {

    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;

    public AdminDashboardService(ProjectRepository projectRepository, UserRepository userRepository, NotificationRepository notificationRepository) {
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
        this.notificationRepository = notificationRepository;
    }

    public AdminDashboardResponse getOverview() {
        List<Project> projects = projectRepository.findAll();
        AdminDashboardResponse response = new AdminDashboardResponse();
        response.setTotalUsers(userRepository.count());
        response.setTotalTeams(countUniqueManagers(projects));

        List<Project> archived = projects.stream()
                .filter(p -> Boolean.TRUE.equals(p.getIsArchived()))
                .collect(Collectors.toList());

        List<Project> nonArchived = projects.stream()
                .filter(p -> !Boolean.TRUE.equals(p.getIsArchived()))
                .collect(Collectors.toList());

        List<Project> onHold = nonArchived.stream()
                .filter(this::isOnHoldProject)
                .collect(Collectors.toList());

        List<Project> active = nonArchived.stream()
                .filter(p -> !isOnHoldProject(p))
                .collect(Collectors.toList());

        response.setActiveProjects(active.size());
        response.setCompletedProjects(archived.size());
        response.setOnHoldProjects(onHold.size());

        response.setProjectOverview(buildProjectOverview(active, archived, onHold));
        response.setProjectHighlights(buildProjectHighlights(active, onHold, archived));

        List<AdminPendingApprovalDto> pendingApprovals = buildPendingApprovals(projects);
        response.setPendingApprovals(pendingApprovals);
        response.setPendingRequests(pendingApprovals.size());

        List<Notification> announcements = notificationRepository.findByTypeOrderByCreatedAtDesc("announcement", PageRequest.of(0, 5));
        response.setAnnouncements(announcements.stream()
                .map(Notification::getTitle)
                .toList());

        return response;
    }

    private long countUniqueManagers(List<Project> projects) {
        return projects.stream()
                .map(Project::getManagerEmail)
                .filter(this::hasText)
                .map(email -> email.trim().toLowerCase(Locale.ENGLISH))
                .distinct()
                .count();
    }

    private List<AdminProjectStatusDto> buildProjectOverview(List<Project> active, List<Project> archived, List<Project> onHold) {
        Map<String, String> cache = new HashMap<>();
        List<AdminProjectStatusDto> overview = new ArrayList<>();
        overview.add(createStatus("Active Projects", active, cache));
        overview.add(createStatus("Completed Projects", archived, cache));
        overview.add(createStatus("On Hold Projects", onHold, cache));
        return overview;
    }

    private AdminProjectStatusDto createStatus(String label, List<Project> projects, Map<String, String> cache) {
        String ownerName = null;
        String ownerEmail = null;
        if (!projects.isEmpty()) {
            Project first = projects.get(0);
            ownerEmail = normalizeText(first.getManagerEmail());
            ownerName = resolveManagerName(ownerEmail, cache);
            if (ownerName == null && first.getTeamLead() != null) {
                ownerName = first.getTeamLead();
            }
        }
        return new AdminProjectStatusDto(label, projects.size(), ownerName, ownerEmail);
    }

    private List<AdminProjectHighlightDto> buildProjectHighlights(List<Project> active, List<Project> onHold, List<Project> archived) {
        Map<String, String> cache = new HashMap<>();
        List<AdminProjectHighlightDto> highlights = new ArrayList<>();
        addHighlights(highlights, active, "Active", cache);
        if (highlights.size() < 3) {
            addHighlights(highlights, onHold, "On Hold", cache);
        }
        if (highlights.size() < 3) {
            addHighlights(highlights, archived, "Completed", cache);
        }
        return highlights;
    }

    private void addHighlights(List<AdminProjectHighlightDto> highlights, List<Project> source, String statusLabel, Map<String, String> cache) {
        for (Project project : source) {
            if (highlights.size() >= 3) {
                break;
            }
            highlights.add(buildHighlight(project, statusLabel, cache));
        }
    }

    private AdminProjectHighlightDto buildHighlight(Project project, String statusLabel, Map<String, String> cache) {
        long totalIssues = project.getTotalIssues() != null ? project.getTotalIssues() : 0;
        long completedIssues = project.getCompletedIssues() != null ? project.getCompletedIssues() : 0;
        long activeIssues = Math.max(totalIssues - completedIssues, 0);
        int completionPct = totalIssues <= 0 ? 0 : (int) Math.round((double) completedIssues * 100d / totalIssues);
        String managerEmail = normalizeText(project.getManagerEmail());
        String managerName = resolveManagerName(managerEmail, cache);
        String lead = normalizeText(project.getTeamLead());
        if (lead == null) {
            lead = managerName;
        }
        return new AdminProjectHighlightDto(
                project.getId(),
                normalizeText(project.getProjectKey()),
                normalizeText(project.getName()),
                statusLabel,
                managerName,
                lead,
                completionPct,
                totalIssues,
                completedIssues,
                activeIssues
        );
    }

    private List<AdminPendingApprovalDto> buildPendingApprovals(List<Project> projects) {
        List<AdminPendingApprovalDto> pending = new ArrayList<>();
        for (Project project : projects) {
            if (project == null || project.getTeamMembers() == null) {
                continue;
            }
            for (ProjectMember member : project.getTeamMembers()) {
                if (member == null) {
                    continue;
                }
                if (!isPendingStatus(member.getStatus())) {
                    continue;
                }
                String memberName = normalizeText(member.getName());
                if (memberName == null) {
                    memberName = normalizeText(member.getEmail());
                }
                pending.add(new AdminPendingApprovalDto(
                        project.getId(),
                        normalizeText(project.getProjectKey()),
                        normalizeText(project.getName()),
                        memberName,
                        normalizeText(member.getEmail()),
                        normalizeText(member.getStatus())
                ));
            }
        }
        return pending;
    }

    public PendingRequestResponse listPendingRequests() {
        List<Project> projects = projectRepository.findAll();
        List<AdminPendingApprovalDto> pendingApprovals = buildPendingApprovals(projects);
        List<AdminPendingApprovalDto> roleChangeRequests = pendingApprovals.stream()
                .filter(this::isRoleChangeRequest)
                .collect(Collectors.toList());
        List<AdminPendingApprovalDto> joinRequests = pendingApprovals.stream()
                .filter(dto -> !isRoleChangeRequest(dto))
                .collect(Collectors.toList());
        PendingRequestResponse response = new PendingRequestResponse();
        response.setJoinRequests(joinRequests);
        response.setRoleChangeRequests(roleChangeRequests);
        response.setProjectRequests(buildProjectCreationRequests(projects));
        return response;
    }

    private List<ProjectCreationRequestDto> buildProjectCreationRequests(List<Project> projects) {
        if (projects == null) {
            return new ArrayList<>();
        }
        Map<String, String> managerNameCache = new HashMap<>();
        LocalDateTime threshold = LocalDateTime.now().minusDays(14);
        return projects.stream()
                .filter(project -> project != null && !Boolean.TRUE.equals(project.getIsArchived()))
                .filter(project -> project.getCreatedAt() != null && project.getCreatedAt().isAfter(threshold))
                .sorted(Comparator.comparing(Project::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(project -> new ProjectCreationRequestDto(
                        project.getId(),
                        normalizeText(project.getProjectKey()),
                        normalizeText(project.getName()),
                        normalizeText(project.getManagerEmail()),
                        resolveManagerName(normalizeText(project.getManagerEmail()), managerNameCache),
                        project.getCreatedAt()
                ))
                .collect(Collectors.toList());
    }

    private boolean isRoleChangeRequest(AdminPendingApprovalDto dto) {
        if (dto == null) {
            return false;
        }
        String status = normalizeText(dto.getStatus());
        return status != null && status.toLowerCase(Locale.ENGLISH).contains("role");
    }

    public List<ManagerTeamDto> listManagerTeams() {
        List<Project> projects = projectRepository.findAll();
        Map<String, ManagerTeamDto> managers = new LinkedHashMap<>();
        Map<String, String> managerNameCache = new HashMap<>();

        for (Project project : projects) {
            if (project == null) {
                continue;
            }
            String managerEmail = normalizeText(project.getManagerEmail());
            if (!hasText(managerEmail)) {
                continue;
            }
            ManagerTeamDto managerDto = managers.computeIfAbsent(managerEmail, (key) -> {
                String resolved = resolveManagerName(key, managerNameCache);
                return new ManagerTeamDto(key, resolved);
            });

            ProjectTeamDto projectDto = new ProjectTeamDto(
                    project.getId(),
                    project.getName(),
                    project.getProjectKey()
            );
            if (project.getTeamMembers() != null) {
                for (ProjectMember member : project.getTeamMembers()) {
                    if (member == null) {
                        continue;
                    }
                    ManagerTeamMemberDto memberDto = new ManagerTeamMemberDto(
                            member.getName(),
                            member.getEmail(),
                            member.getRole(),
                            member.getStatus()
                    );
                    projectDto.getMembers().add(memberDto);
                }
            }
            managerDto.getProjects().add(projectDto);
        }

        return new ArrayList<>(managers.values());
    }

    private boolean isPendingStatus(String status) {
        String normalized = normalizeText(status);
        if (normalized == null) {
            return false;
        }
        return normalized.contains("invite") || normalized.contains("pending") || normalized.contains("approval");
    }

    private boolean isOnHoldProject(Project project) {
        String type = normalizeText(project.getProjectType());
        if (type != null && (type.contains("hold") || type.contains("pause") || type.contains("freeze"))) {
            return true;
        }
        String name = normalizeText(project.getName());
        return name != null && name.contains("hold");
    }

    private String resolveManagerName(String email, Map<String, String> cache) {
        if (!hasText(email)) {
            return null;
        }
        String key = email.trim().toLowerCase(Locale.ENGLISH);
        if (cache.containsKey(key)) {
            return cache.get(key);
        }
        User user = userRepository.findByEmailIgnoreCase(key).orElse(null);
        String resolved = user != null ? normalizeText(user.getName()) : null;
        cache.put(key, resolved);
        return resolved;
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private String normalizeText(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
