package com.team1.backend.service;

import com.team1.backend.model.Project;
import com.team1.backend.model.ProjectMember;
import com.team1.backend.repository.ProjectRepository;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

@Service
public class ProjectService {

    private final ProjectRepository projectRepository;

    public ProjectService(ProjectRepository projectRepository) {
        this.projectRepository = projectRepository;
    }

    public List<Project> getProjects(
            String managerEmail,
            String memberEmail,
            String organizationId,
            String organizationUsername,
            String organizationName
    ) {
        String normalizedManager = normalizeEmail(managerEmail);
        String normalizedMember = normalizeEmail(memberEmail);
        String normalizedOrgId = normalizeText(organizationId);
        String normalizedOrgUsername = normalizeSlug(organizationUsername);
        String normalizedOrgName = normalizeText(organizationName);

        boolean hasOrgFilter = (normalizedOrgId != null && !normalizedOrgId.isEmpty())
                || (normalizedOrgUsername != null && !normalizedOrgUsername.isEmpty())
                || (normalizedOrgName != null && !normalizedOrgName.isEmpty());

        if (hasOrgFilter) {
            List<Project> scoped = collectProjects(normalizedOrgId, normalizedOrgUsername, normalizedOrgName);
            return filterByAccess(scoped, normalizedManager, normalizedMember);
        }

        if (normalizedManager != null && !normalizedManager.isEmpty()) {
            return projectRepository.findByManagerEmail(normalizedManager);
        }

        if (normalizedMember != null && !normalizedMember.isEmpty()) {
            return projectRepository.findByTeamMembersEmail(normalizedMember);
        }

        return projectRepository.findAll();
    }

    public Project getProjectById(String id) {
        return projectRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Project not found"));
    }

    public Project createProject(Project project) {
        String normalizedKey = normalizeKey(project.getProjectKey());
        if (normalizedKey == null || normalizedKey.isEmpty()) {
            throw new IllegalArgumentException("Project key is required");
        }
        String normalizedName = normalizeText(project.getName());
        if (normalizedName == null || normalizedName.isEmpty()) {
            throw new IllegalArgumentException("Project name is required");
        }

        project.setProjectKey(normalizedKey);
        project.setName(normalizedName);
        project.setDescription(normalizeText(project.getDescription()));
        project.setManagerEmail(normalizeEmail(project.getManagerEmail()));
        project.setOrganizationId(normalizeText(project.getOrganizationId()));
        project.setOrganizationUsername(normalizeSlug(project.getOrganizationUsername()));
        project.setOrganizationName(normalizeText(project.getOrganizationName()));
        List<ProjectMember> normalizedTeamMembers = normalizeTeamMembers(project.getTeamMembers());
        validateSingleAdmin(normalizedTeamMembers);
        project.setTeamMembers(normalizedTeamMembers);

        if (project.getProjectType() == null || project.getProjectType().trim().isEmpty()) {
            project.setProjectType("Scrum");
        }
        if (project.getIcon() != null && project.getIcon().trim().isEmpty()) {
            project.setIcon(null);
        }
        if (project.getIsArchived() == null) {
            project.setIsArchived(false);
        }
        if (project.getTotalIssues() == null) {
            project.setTotalIssues(0);
        }
        if (project.getCompletedIssues() == null) {
            project.setCompletedIssues(0);
        }

        String managerEmail = project.getManagerEmail();
        if (managerEmail != null && !managerEmail.isEmpty()) {
            Optional<Project> existing = projectRepository.findByProjectKeyAndManagerEmail(normalizedKey, managerEmail);
            if (existing.isPresent()) {
                throw new IllegalStateException("Project key already exists.");
            }
        }

        project.setCreatedAt(LocalDateTime.now());
        project.setUpdatedAt(LocalDateTime.now());

        return projectRepository.save(project);
    }

    public Project updateProject(String id, Project updated) {
        Project existing = projectRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Project not found"));

        String nextKey = normalizeKey(updated.getProjectKey());
        if (nextKey != null && !nextKey.isEmpty() && !nextKey.equals(existing.getProjectKey())) {
            String managerEmail = normalizeEmail(updated.getManagerEmail());
            if (managerEmail == null || managerEmail.isEmpty()) {
                managerEmail = existing.getManagerEmail();
            }
            if (managerEmail != null && !managerEmail.isEmpty()) {
                Optional<Project> conflict = projectRepository.findByProjectKeyAndManagerEmail(nextKey, managerEmail);
                if (conflict.isPresent() && !conflict.get().getId().equals(existing.getId())) {
                    throw new IllegalStateException("Project key already exists.");
                }
            }
            existing.setProjectKey(nextKey);
        }

        String nextName = normalizeText(updated.getName());
        if (nextName != null && !nextName.isEmpty()) {
            existing.setName(nextName);
        }

        if (updated.getDescription() != null) {
            existing.setDescription(normalizeText(updated.getDescription()));
        }

        if (updated.getIcon() != null && !updated.getIcon().trim().isEmpty()) {
            existing.setIcon(updated.getIcon().trim());
        }

        if (updated.getProjectType() != null && !updated.getProjectType().trim().isEmpty()) {
            existing.setProjectType(updated.getProjectType().trim());
        }

        if (updated.getIsArchived() != null) {
            existing.setIsArchived(updated.getIsArchived());
        }

        if (updated.getTeamLead() != null && !updated.getTeamLead().trim().isEmpty()) {
            existing.setTeamLead(updated.getTeamLead().trim());
        }

        if (updated.getManagerEmail() != null) {
            existing.setManagerEmail(normalizeEmail(updated.getManagerEmail()));
        }

        if (updated.getOrganizationId() != null) {
            existing.setOrganizationId(normalizeText(updated.getOrganizationId()));
        }

        if (updated.getOrganizationUsername() != null) {
            existing.setOrganizationUsername(normalizeSlug(updated.getOrganizationUsername()));
        }

        if (updated.getOrganizationName() != null) {
            existing.setOrganizationName(normalizeText(updated.getOrganizationName()));
        }

        if (updated.getTeamMembers() != null) {
            List<ProjectMember> normalizedTeamMembers = normalizeTeamMembers(updated.getTeamMembers());
            validateSingleAdmin(normalizedTeamMembers);
            existing.setTeamMembers(normalizedTeamMembers);
        }

        if (updated.getTotalIssues() != null) {
            existing.setTotalIssues(updated.getTotalIssues());
        }

        if (updated.getCompletedIssues() != null) {
            existing.setCompletedIssues(updated.getCompletedIssues());
        }

        existing.setUpdatedAt(LocalDateTime.now());
        return projectRepository.save(existing);
    }

    public void deleteProject(String id) {
        projectRepository.deleteById(id);
    }

    public Optional<String> updateProjectMemberStatus(String projectId, String memberEmail, String status) {
        if (!hasText(projectId) || !hasText(memberEmail)) {
            throw new IllegalArgumentException("projectId and memberEmail are required");
        }
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));
        List<ProjectMember> members = project.getTeamMembers();
        if (members == null || members.isEmpty()) {
            return Optional.empty();
        }
        String normalizedMemberEmail = normalizeEmail(memberEmail);
        boolean updated = false;
        for (ProjectMember member : members) {
            if (member == null) continue;
            String normalizedCandidate = normalizeEmail(member.getEmail());
            if (normalizedMemberEmail != null && normalizedMemberEmail.equals(normalizedCandidate)) {
                member.setStatus(status);
                updated = true;
                break;
            }
        }
        if (!updated) {
            return Optional.empty();
        }
        project.setUpdatedAt(LocalDateTime.now());
        projectRepository.save(project);
        return Optional.of(status);
    }

    private String normalizeKey(String key) {
        if (key == null) return null;
        return key.trim().toUpperCase();
    }

    private String normalizeText(String text) {
        if (text == null) return null;
        String trimmed = text.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private String normalizeEmail(String email) {
        if (email == null) return null;
        String trimmed = email.trim().toLowerCase();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private List<Project> collectProjects(String organizationId, String organizationUsername, String organizationName) {
        Map<String, Project> uniqueProjects = new LinkedHashMap<>();
        if (organizationId != null && !organizationId.isEmpty()) {
            addProjects(uniqueProjects, projectRepository.findByOrganizationId(organizationId));
        }
        if (organizationUsername != null && !organizationUsername.isEmpty()) {
            addProjects(uniqueProjects, projectRepository.findByOrganizationUsername(organizationUsername));
        }
        if (organizationName != null && !organizationName.isEmpty()) {
            addProjects(uniqueProjects, projectRepository.findByOrganizationNameIgnoreCase(organizationName));
        }
        return new ArrayList<>(uniqueProjects.values());
    }

    private void addProjects(Map<String, Project> target, List<Project> projects) {
        if (projects == null) return;
        for (Project project : projects) {
            if (project == null) continue;
            String key = project.getId() != null ? project.getId() : project.getProjectKey();
            if (key == null) continue;
            target.put(key, project);
        }
    }

    private List<Project> filterByAccess(List<Project> projects, String managerEmail, String memberEmail) {
        if (projects == null || projects.isEmpty()) {
            return new ArrayList<>();
        }
        if (managerEmail != null && !managerEmail.isEmpty()) {
            return projects.stream()
                    .filter(project -> managerEmail.equals(normalizeEmail(project.getManagerEmail())))
                    .collect(Collectors.toList());
        }
        if (memberEmail != null && !memberEmail.isEmpty()) {
            return projects.stream()
                    .filter(project -> hasMemberEmail(project, memberEmail))
                    .collect(Collectors.toList());
        }
        return projects;
    }

    private boolean hasMemberEmail(Project project, String memberEmail) {
        if (project == null || memberEmail == null || memberEmail.isEmpty()) return false;
        List<ProjectMember> members = project.getTeamMembers();
        if (members == null || members.isEmpty()) return false;
        for (ProjectMember member : members) {
            if (member == null) continue;
            String email = normalizeEmail(member.getEmail());
            if (memberEmail.equals(email)) {
                return true;
            }
        }
        return false;
    }

    private List<ProjectMember> normalizeTeamMembers(List<ProjectMember> members) {
        if (members == null) return null;
        Map<String, ProjectMember> unique = new LinkedHashMap<>();
        for (ProjectMember member : members) {
            if (member == null) {
                continue;
            }
            ProjectMember normalized = new ProjectMember();
            normalized.setMemberId(normalizeText(member.getMemberId()));
            normalized.setName(normalizeText(member.getName()));
            normalized.setEmail(normalizeEmail(member.getEmail()));
            normalized.setRole(normalizeText(member.getRole()));
            normalized.setStatus(normalizeText(member.getStatus()));

            String key = normalized.getEmail();
            if (key == null || key.isEmpty()) {
                String nameKey = normalized.getName();
                key = nameKey == null ? null : nameKey.toLowerCase();
            }
            if (key == null || key.isEmpty()) {
                continue;
            }
            unique.put(key, normalized);
        }
        return new ArrayList<>(unique.values());
    }

    private void validateSingleAdmin(List<ProjectMember> members) {
        if (members == null || members.isEmpty()) {
            return;
        }
        long adminCount = members.stream()
                .filter(member -> member != null && "admin".equals(normalizeRole(member.getRole())))
                .count();
        if (adminCount > 1) {
            throw new IllegalStateException("Only one admin is allowed per project.");
        }
    }

    private String normalizeRole(String role) {
        if (role == null) return null;
        String normalized = role.trim().toLowerCase();
        return normalized.isEmpty() ? null : normalized;
    }

    private String normalizeSlug(String value) {
        if (value == null) return null;
        String normalized = value.trim().toLowerCase();
        if (normalized.isEmpty()) return null;
        normalized = normalized.replaceAll("\\s+", "-");
        normalized = normalized.replaceAll("[^a-z0-9-]", "");
        normalized = normalized.replaceAll("-{2,}", "-");
        normalized = normalized.replaceAll("(^-+)|(-+$)", "");
        return normalized.isEmpty() ? null : normalized;
    }
}
