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
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

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

    public Issue create(String userId, Issue issue){
        User user = requireUser(userId);
        if (issue == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Issue payload is required");
        }
        if (issue.getCreatorEmail() == null || issue.getCreatorEmail().trim().isEmpty()) {
            issue.setCreatorEmail(user.getEmail());
        }
        if (issue.getCreatorName() == null || issue.getCreatorName().trim().isEmpty()) {
            issue.setCreatorName(user.getName() != null ? user.getName() : user.getEmail());
        }
        return createInternal(issue, userId, user);
    }

    private Issue createInternal(Issue issue, String userId, User creator){
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
        if (notificationService != null && creator != null) {
            try {
                sendNotification(
                        userId,
                        "issue_created",
                        "Issue created: " + getIssueDisplayLabel(saved),
                        "/all-my-issues"
                );
                notifyAssigneeAboutAssignment(creator, saved);
            } catch (Exception ignored) {
                // Avoid blocking issue creation on notification failures
            }
        }

        return saved;
    }

    public Issue update(String userId, String id, Issue updated) {
        User user = requireUser(userId);
        Issue existing = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Issue not found"));
        if (existing.getCreatorEmail() != null
                && user.getEmail() != null
                && !existing.getCreatorEmail().equalsIgnoreCase(user.getEmail())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not allowed");
        }
        String previousAssigneeEmail = normalizeEmail(existing.getAssigneeEmail());
        String previousStatus = normalizeStatus(existing.getStatus());
        updated.setCreatorEmail(existing.getCreatorEmail());
        updated.setCreatorName(existing.getCreatorName());
        Issue saved = applyUpdates(existing, updated);
        notifyIssueUpdate(user, saved, previousAssigneeEmail, previousStatus);
        return saved;
    }

    public Issue update(String id, Issue updated){
        return repo.findById(id)
                .map(existing -> applyUpdates(existing, updated))
                .orElseGet(() -> {
                    updated.setId(id);
                    updated.setCreatedAt(LocalDateTime.now());
                    updated.setUpdatedAt(LocalDateTime.now());
                    return repo.save(updated);
                });
    }

    public void delete(String userId, String id) {
        User user = requireUser(userId);
        Issue existing = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Issue not found"));
        if (existing.getCreatorEmail() != null
                && user.getEmail() != null
                && !existing.getCreatorEmail().equalsIgnoreCase(user.getEmail())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not allowed");
        }
        repo.delete(existing);
    }

    public void delete(String id){ repo.deleteById(id); }

    private User requireUser(String userId) {
        if (userId == null || userId.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing X-USER-ID");
        }
        return userRepository.findById(userId.trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid user"));
    }

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

    private Issue applyUpdates(Issue existing, Issue updated) {
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
    }

    private void notifyIssueUpdate(User actor, Issue saved, String previousAssigneeEmail, String previousStatus) {
        if (notificationService == null || actor == null || saved == null) {
            return;
        }

        String currentAssigneeEmail = normalizeEmail(saved.getAssigneeEmail());
        if (currentAssigneeEmail != null
                && !sameEmail(currentAssigneeEmail, previousAssigneeEmail)
                && !sameEmail(currentAssigneeEmail, actor.getEmail())) {
            notifyUserByEmail(
                    currentAssigneeEmail,
                    "issue_assigned",
                    "You were assigned: " + getIssueDisplayLabel(saved),
                    "/all-my-issues"
            );
        }

        String currentStatus = normalizeStatus(saved.getStatus());
        if (!sameText(currentStatus, previousStatus)) {
            Set<String> recipients = new LinkedHashSet<>();
            addRecipientEmail(recipients, saved.getCreatorEmail(), actor.getEmail());
            addRecipientEmail(recipients, currentAssigneeEmail, actor.getEmail());
            String title = "Status changed: " + getIssueDisplayLabel(saved) + " is now " + formatStatusLabel(currentStatus);
            for (String recipientEmail : recipients) {
                notifyUserByEmail(recipientEmail, "status_changed", title, "/all-my-issues");
            }
        }
    }

    private void notifyAssigneeAboutAssignment(User actor, Issue saved) {
        if (saved == null || actor == null) {
            return;
        }
        String assigneeEmail = normalizeEmail(saved.getAssigneeEmail());
        if (assigneeEmail == null || sameEmail(assigneeEmail, actor.getEmail())) {
            return;
        }
        notifyUserByEmail(
                assigneeEmail,
                "issue_assigned",
                "You were assigned: " + getIssueDisplayLabel(saved),
                "/all-my-issues"
        );
    }

    private void notifyUserByEmail(String email, String type, String title, String href) {
        String normalizedEmail = normalizeEmail(email);
        if (normalizedEmail == null) {
            return;
        }
        userRepository.findByEmailIgnoreCase(normalizedEmail)
                .map(User::getId)
                .ifPresent(userId -> sendNotification(userId, type, title, href));
    }

    private void sendNotification(String userId, String type, String title, String href) {
        if (notificationService == null || userId == null || userId.isBlank()) {
            return;
        }
        try {
            CreateNotificationRequest req = new CreateNotificationRequest();
            req.setType(type);
            req.setTitle(title);
            req.setHref(href);
            notificationService.create(userId, req);
        } catch (Exception ignored) {
            // Keep notification failures from interrupting issue flows.
        }
    }

    private void addRecipientEmail(Set<String> recipients, String candidateEmail, String actorEmail) {
        String normalizedCandidate = normalizeEmail(candidateEmail);
        if (normalizedCandidate == null || sameEmail(normalizedCandidate, actorEmail)) {
            return;
        }
        recipients.add(normalizedCandidate);
    }

    private boolean sameEmail(String left, String right) {
        return sameText(normalizeEmail(left), normalizeEmail(right));
    }

    private boolean sameText(String left, String right) {
        if (left == null) return right == null;
        return left.equals(right);
    }

    private String getIssueDisplayLabel(Issue issue) {
        if (issue == null) {
            return "Issue";
        }
        if (issue.getIssueKey() != null && !issue.getIssueKey().isBlank()) {
            return issue.getIssueKey();
        }
        if (issue.getSummary() != null && !issue.getSummary().isBlank()) {
            return issue.getSummary().trim();
        }
        return "Issue";
    }

    private String formatStatusLabel(String status) {
        String normalized = normalizeStatus(status);
        return switch (normalized) {
            case "progress" -> "In Progress";
            case "review" -> "In Review";
            case "done" -> "Done";
            default -> "To Do";
        };
    }
}
