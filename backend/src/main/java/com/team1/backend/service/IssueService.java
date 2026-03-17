package com.team1.backend.service;

import com.team1.backend.model.Issue;
import com.team1.backend.model.User;
import com.team1.backend.dto.CreateNotificationRequest;
import com.team1.backend.repository.IssueRepository;
import com.team1.backend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class IssueService {

    private final IssueRepository repo;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    public IssueService(IssueRepository repo, UserRepository userRepository, NotificationService notificationService){
        this.repo = repo;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
    }

    public List<Issue> listAll(String project){
        if (project == null || project.trim().isEmpty()) {
            return repo.findAll();
        }
        return repo.findByProject(normalizeProjectKey(project));
    }

    public Optional<Issue> findMineById(String userId, String id){
        User user = requireUser(userId);
        return repo.findByIdAndCreatorEmailIgnoreCase(id, user.getEmail());
    }

    public Issue create(Issue issue){
        issue.setProject(normalizeProjectKey(issue.getProject()));
        issue.setIssueType(normalizeText(issue.getIssueType()));
        issue.setEpicName(normalizeText(issue.getEpicName()));
        issue.setSummary(normalizeText(issue.getSummary()));
        issue.setDescription(normalizeText(issue.getDescription()));
        issue.setCreatorName(normalizeText(issue.getCreatorName()));
        issue.setCreatorEmail(normalizeEmail(issue.getCreatorEmail()));
        issue.setAssignDate(normalizeText(issue.getAssignDate()));
        issue.setDeadlineDate(normalizeText(issue.getDeadlineDate()));

        if (issue.getStatus() == null || issue.getStatus().trim().isEmpty()) {
            issue.setStatus("todo");
        } else {
            issue.setStatus(normalizeStatus(issue.getStatus()));
        }

        if (issue.getPriority() == null || issue.getPriority().trim().isEmpty()) {
            issue.setPriority(mapDifficultyToPriority(issue.getDifficulty()));
        } else {
            issue.setPriority(normalizePriority(issue.getPriority()));
        }

        if (issue.getPoints() == null) {
            issue.setPoints(mapDifficultyToPoints(issue.getDifficulty()));
        }

        if (issue.getLabels() == null) {
            issue.setLabels(new ArrayList<>());
        }

        if (issue.getAssigneeName() == null || issue.getAssigneeName().trim().isEmpty()) {
            issue.setAssigneeName(issue.getCreatorName());
        }
        if (issue.getAssigneeEmail() == null || issue.getAssigneeEmail().trim().isEmpty()) {
            issue.setAssigneeEmail(issue.getCreatorEmail());
        }

        issue.setCreatedAt(LocalDateTime.now());
        issue.setUpdatedAt(LocalDateTime.now());
        Issue saved = repo.save(issue);
        if (saved.getIssueKey() == null || saved.getIssueKey().trim().isEmpty()) {
            String base = normalizeProjectKey(saved.getProject());
            String shortId = saved.getId() != null && saved.getId().length() >= 4
                    ? saved.getId().substring(0, 4).toUpperCase()
                    : String.valueOf(System.currentTimeMillis()).substring(0, 4);
            saved.setIssueKey(base + "-" + shortId);
            saved = repo.save(saved);
        }
        return saved;
    }

    public Issue update(String id, Issue updated){
        return repo.findById(id).map(existing -> {
            if (updated.getCreatorName() != null) {
                existing.setCreatorName(normalizeText(updated.getCreatorName()));
            }
            if (updated.getCreatorEmail() != null) {
                existing.setCreatorEmail(normalizeEmail(updated.getCreatorEmail()));
            }
            if (updated.getProject() != null) {
                existing.setProject(normalizeProjectKey(updated.getProject()));
            }
            if (updated.getIssueType() != null) {
                existing.setIssueType(normalizeText(updated.getIssueType()));
            }
            if (updated.getEpicName() != null) {
                existing.setEpicName(normalizeText(updated.getEpicName()));
            }
            if (updated.getSummary() != null) {
                existing.setSummary(normalizeText(updated.getSummary()));
            }
            if (updated.getDescription() != null) {
                existing.setDescription(normalizeText(updated.getDescription()));
            }
            if (updated.getAttachmentsJson() != null) {
                existing.setAttachmentsJson(updated.getAttachmentsJson());
            }
            if (updated.getDifficulty() != null) {
                existing.setDifficulty(updated.getDifficulty());
            }
            if (updated.getIssueKey() != null && !updated.getIssueKey().trim().isEmpty()) {
                existing.setIssueKey(updated.getIssueKey().trim());
            }
            if (updated.getStatus() != null && !updated.getStatus().trim().isEmpty()) {
                existing.setStatus(normalizeStatus(updated.getStatus()));
            }
            if (updated.getPriority() != null && !updated.getPriority().trim().isEmpty()) {
                existing.setPriority(normalizePriority(updated.getPriority()));
            }
            if (updated.getPoints() != null) {
                existing.setPoints(updated.getPoints());
            }
            if (updated.getAssigneeName() != null) {
                existing.setAssigneeName(normalizeText(updated.getAssigneeName()));
            }
            if (updated.getAssigneeEmail() != null) {
                existing.setAssigneeEmail(normalizeEmail(updated.getAssigneeEmail()));
            }
            if (updated.getAssignDate() != null) {
                existing.setAssignDate(normalizeText(updated.getAssignDate()));
            }
            if (updated.getDeadlineDate() != null) {
                existing.setDeadlineDate(normalizeText(updated.getDeadlineDate()));
            }
            if (updated.getLabels() != null) {
                existing.setLabels(updated.getLabels());
            }
            existing.setUpdatedAt(LocalDateTime.now());
            return repo.save(existing);
        }).orElseGet(() -> {
            updated.setId(id);
            updated.setCreatedAt(LocalDateTime.now());
            updated.setUpdatedAt(LocalDateTime.now());
            return repo.save(updated);
        });
    }

    public void delete(String id){ repo.deleteById(id); }

    private String normalizeText(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String normalizeEmail(String value) {
        if (value == null) return null;
        String trimmed = value.trim().toLowerCase();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String normalizeStatus(String value) {
        if (value == null) return "todo";
        String normalized = value.trim().toLowerCase();
        return switch (normalized) {
            case "todo", "to-do" -> "todo";
            case "progress", "in-progress", "in progress" -> "progress";
            case "review", "in-review", "in review" -> "review";
            case "done", "completed" -> "done";
            default -> "todo";
        };
    }

    private String normalizePriority(String value) {
        if (value == null) return null;
        String normalized = value.trim().toLowerCase();
        return switch (normalized) {
            case "critical", "high", "medium", "low" -> normalized;
            default -> normalized;
        };
    }

    private String mapDifficultyToPriority(String difficulty) {
        if (difficulty == null) return "medium";
        String normalized = difficulty.trim().toLowerCase();
        return switch (normalized) {
            case "high" -> "high";
            case "low" -> "low";
            default -> "medium";
        };
    }

    private Integer mapDifficultyToPoints(String difficulty) {
        if (difficulty == null) return 3;
        String normalized = difficulty.trim().toLowerCase();
        return switch (normalized) {
            case "high" -> 8;
            case "low" -> 2;
            default -> 5;
        };
    }

    private String normalizeProjectKey(String project) {
        if (project == null || project.trim().isEmpty()) {
            return "ISSUE";
        }
        return project.trim().toUpperCase();
    }
}
