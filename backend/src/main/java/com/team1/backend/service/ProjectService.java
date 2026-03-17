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
import org.springframework.stereotype.Service;

@Service
public class ProjectService {

    private final ProjectRepository projectRepository;

    public ProjectService(ProjectRepository projectRepository) {
        this.projectRepository = projectRepository;
    }

    public List<Project> getProjects(String managerEmail, String memberEmail) {
        String normalizedManager = normalizeEmail(managerEmail);
        if (normalizedManager != null && !normalizedManager.isEmpty()) {
            return projectRepository.findByManagerEmail(normalizedManager);
        }

        String normalizedMember = normalizeEmail(memberEmail);
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
        project.setTeamMembers(normalizeTeamMembers(project.getTeamMembers()));

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

        if (updated.getTeamMembers() != null) {
            existing.setTeamMembers(normalizeTeamMembers(updated.getTeamMembers()));
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

    private String normalizeKey(String key) {
        if (key == null) return null;
        return key.trim().toUpperCase();
    }

    private String normalizeText(String text) {
        if (text == null) return null;
        String trimmed = text.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String normalizeEmail(String email) {
        if (email == null) return null;
        String trimmed = email.trim().toLowerCase();
        return trimmed.isEmpty() ? null : trimmed;
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
}
