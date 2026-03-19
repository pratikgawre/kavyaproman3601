package com.team1.backend.service;

import com.team1.backend.model.Issue;
import com.team1.backend.model.IssueAttachment;
import com.team1.backend.model.IssueComment;
import com.team1.backend.model.Project;
import com.team1.backend.model.ProjectMember;
import com.team1.backend.model.User;
import com.team1.backend.dto.CreateNotificationRequest;
import com.team1.backend.repository.IssueRepository;
import com.team1.backend.repository.ProjectRepository;
import com.team1.backend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class IssueService {

    private final IssueRepository repo;
    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final NotificationService notificationService;

    public IssueService(IssueRepository repo, UserRepository userRepository, ProjectRepository projectRepository, NotificationService notificationService){
        this.repo = repo;
        this.userRepository = userRepository;
        this.projectRepository = projectRepository;
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
                CreateNotificationRequest req = new CreateNotificationRequest();
                req.setType("issue_created");
                req.setTitle("Issue created: " + (saved.getSummary() != null ? saved.getSummary() : saved.getIssueKey()));
                req.setHref("/all-my-issues");
                notificationService.create(userId, req);
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
        if (!canModifyIssue(user, existing)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not allowed");
        }
        String previousStatus = normalizeStatus(existing.getStatus());
        String nextStatus = updated != null && updated.getStatus() != null
                ? normalizeStatus(updated.getStatus())
                : previousStatus;
        enforceTesterReviewUpdate(user, existing, updated, previousStatus, nextStatus);
        if (updated != null && updated.getReviewerEmail() != null) {
            String existingReviewer = normalizeEmail(existing.getReviewerEmail());
            String nextReviewer = normalizeEmail(updated.getReviewerEmail());
            if (existingReviewer != null
                    && !existingReviewer.isEmpty()
                    && nextReviewer != null
                    && !existingReviewer.equalsIgnoreCase(nextReviewer)) {
                String role = normalizeRole(user.getRole());
                boolean isAdmin = "admin".equals(role) || "project manager".equals(role);
                if (!isAdmin && (user.getEmail() == null || !existingReviewer.equalsIgnoreCase(user.getEmail()))) {
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Reviewer already assigned");
                }
            }
        }
        updated.setCreatorEmail(existing.getCreatorEmail());
        updated.setCreatorName(existing.getCreatorName());
        Issue saved = update(id, updated);
        if (!previousStatus.equals(nextStatus)) {
            maybeNotifyTestersOnReview(user, existing, nextStatus, saved);
            maybeNotifyDeveloperOnDone(user, existing, nextStatus, saved);
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
            if (updated.getReviewerName() != null) {
                existing.setReviewerName(normalizeText(updated.getReviewerName()));
            }
            if (updated.getReviewerEmail() != null) {
                existing.setReviewerEmail(normalizeEmail(updated.getReviewerEmail()));
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

    public Issue addComment(String userId, String id, String message, List<IssueAttachment> attachments) {
        User user = requireUser(userId);
        Issue existing = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Issue not found"));
        if (!canModifyIssue(user, existing)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not allowed");
        }
        enforceTesterReviewComment(user, existing);
        String trimmed = message == null ? "" : message.trim();
        if (trimmed.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Comment message required");
        }

        IssueComment comment = new IssueComment();
        comment.setId(UUID.randomUUID().toString());
        comment.setAuthorEmail(normalizeEmail(user.getEmail()));
        comment.setAuthorName(user.getName() != null ? user.getName().trim() : user.getEmail());
        comment.setMessage(trimmed);
        comment.setAttachments(attachments);
        comment.setCreatedAt(LocalDateTime.now());

        List<IssueComment> comments = existing.getComments();
        if (comments == null) {
            comments = new ArrayList<>();
        }
        comments.add(comment);
        existing.setComments(comments);
        existing.setUpdatedAt(LocalDateTime.now());
        return repo.save(existing);
    }

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

    private boolean canModifyIssue(User user, Issue issue) {
        if (user == null || issue == null) return false;
        String role = normalizeRole(user.getRole());
        if ("admin".equals(role) || "project manager".equals(role)) return true;
        String creator = issue.getCreatorEmail();
        if (creator != null && user.getEmail() != null && creator.equalsIgnoreCase(user.getEmail())) return true;
        return isProjectMember(user.getEmail(), issue.getProject());
    }

    private boolean isAdminOrManager(User user) {
        if (user == null) return false;
        String role = normalizeRole(user.getRole());
        return "admin".equals(role) || "project manager".equals(role);
    }

    private boolean isTester(User user) {
        if (user == null) return false;
        return "tester".equals(normalizeRole(user.getRole()));
    }

    private boolean isProjectMember(String email, String projectKey) {
        if (email == null || email.trim().isEmpty()) return false;
        if (projectKey == null || projectKey.trim().isEmpty()) return false;
        String normalizedEmail = normalizeEmail(email);
        String normalizedProject = normalizeProjectKey(projectKey);
        Optional<Project> projectOpt = projectRepository.findByProjectKeyIgnoreCase(normalizedProject);
        if (projectOpt.isEmpty()) return false;
        List<ProjectMember> members = projectOpt.get().getTeamMembers();
        if (members == null || members.isEmpty()) return false;
        for (ProjectMember member : members) {
            if (member == null) continue;
            String memberEmail = normalizeEmail(member.getEmail());
            if (memberEmail != null && memberEmail.equalsIgnoreCase(normalizedEmail)) {
                return true;
            }
        }
        return false;
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

    private String normalizeRole(String value) {
        if (value == null) return "";
        return value.trim().toLowerCase();
    }

    private int countProjectTesters(String projectKey) {
        if (projectKey == null || projectKey.trim().isEmpty()) return 0;
        Optional<Project> projectOpt = projectRepository.findByProjectKeyIgnoreCase(normalizeProjectKey(projectKey));
        if (projectOpt.isEmpty()) return 0;
        List<ProjectMember> members = projectOpt.get().getTeamMembers();
        if (members == null || members.isEmpty()) return 0;
        int count = 0;
        for (ProjectMember member : members) {
            if (member == null) continue;
            String role = normalizeRole(member.getRole());
            if ("tester".equals(role)) count++;
        }
        return count;
    }

    private void enforceTesterReviewUpdate(User user, Issue existing, Issue updated, String previousStatus, String nextStatus) {
        if (!isTester(user) || isAdminOrManager(user)) return;
        boolean reviewStage = "review".equals(previousStatus) || "review".equals(nextStatus);
        if (!reviewStage) return;

        String actorEmail = normalizeEmail(user.getEmail());
        String reviewerEmail = normalizeEmail(existing.getReviewerEmail());
        if (reviewerEmail != null && !reviewerEmail.isEmpty()) {
            if (actorEmail == null || !reviewerEmail.equalsIgnoreCase(actorEmail)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tester already assigned");
            }
            return;
        }

        int testerCount = countProjectTesters(existing.getProject());
        if (testerCount > 1) {
            String requestedReviewer = updated != null ? normalizeEmail(updated.getReviewerEmail()) : null;
            if (requestedReviewer == null || requestedReviewer.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Select a tester before updating");
            }
            boolean leavingReview = "review".equals(previousStatus) && !"review".equals(nextStatus);
            if (leavingReview && (actorEmail == null || !requestedReviewer.equalsIgnoreCase(actorEmail))) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only assigned tester can complete review");
            }
        }
    }

    private void enforceTesterReviewComment(User user, Issue existing) {
        if (!isTester(user) || isAdminOrManager(user) || existing == null) return;
        if (!"review".equals(normalizeStatus(existing.getStatus()))) return;

        String actorEmail = normalizeEmail(user.getEmail());
        String reviewerEmail = normalizeEmail(existing.getReviewerEmail());
        if (reviewerEmail != null && !reviewerEmail.isEmpty()) {
            if (actorEmail == null || !reviewerEmail.equalsIgnoreCase(actorEmail)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tester already assigned");
            }
            return;
        }

        int testerCount = countProjectTesters(existing.getProject());
        if (testerCount > 1) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Select yourself as tester to comment.");
        }
    }

    private void maybeNotifyTestersOnReview(User actor, Issue existing, String nextStatus, Issue saved) {
        if (notificationService == null || actor == null || existing == null) return;
        if (!"review".equals(nextStatus)) return;
        String projectKey = normalizeProjectKey(existing.getProject());
        Optional<Project> projectOpt = projectRepository.findByProjectKeyIgnoreCase(projectKey);
        if (projectOpt.isEmpty()) return;
        List<ProjectMember> members = projectOpt.get().getTeamMembers();
        if (members == null || members.isEmpty()) return;
        for (ProjectMember member : members) {
            if (member == null) continue;
            String memberRole = normalizeRole(member.getRole());
            if (!"tester".equals(memberRole)) continue;
            String memberEmail = normalizeEmail(member.getEmail());
            if (memberEmail == null || memberEmail.isEmpty()) continue;
            userRepository.findByEmailIgnoreCase(memberEmail).ifPresent((testerUser) -> {
                if (testerUser.getId() == null || testerUser.getId().equals(actor.getId())) return;
                CreateNotificationRequest req = new CreateNotificationRequest();
                String issueRef = saved.getIssueKey() != null ? saved.getIssueKey() : saved.getId();
                String titleKey = saved.getIssueKey() != null ? saved.getIssueKey() : (saved.getSummary() != null ? saved.getSummary() : "Issue");
                req.setType("issue_review");
                req.setTitle("Review needed: " + titleKey);
                req.setHref("/projects/" + projectKey + "/board?issue=" + (issueRef == null ? "" : issueRef));
                try {
                    notificationService.create(testerUser.getId(), req);
                } catch (Exception ignored) {
                    // avoid breaking update on notification failures
                }
            });
        }
    }

    private void maybeNotifyDeveloperOnDone(User actor, Issue existing, String nextStatus, Issue saved) {
        if (notificationService == null || actor == null || existing == null) return;
        if (!"done".equals(nextStatus)) return;
        String role = normalizeRole(actor.getRole());
        boolean isTester = "tester".equals(role);
        boolean isProjectManager = "project manager".equals(role) || "admin".equals(role);
        if (!isTester && !isProjectManager) return;

        String developerEmail = normalizeEmail(existing.getAssigneeEmail());
        if (developerEmail == null || developerEmail.isEmpty()) {
            developerEmail = normalizeEmail(existing.getCreatorEmail());
        }
        if (developerEmail == null || developerEmail.isEmpty()) return;

        String projectKey = normalizeProjectKey(existing.getProject());
        userRepository.findByEmailIgnoreCase(developerEmail).ifPresent((developerUser) -> {
            if (developerUser.getId() == null || developerUser.getId().equals(actor.getId())) return;
            String issueRef = saved.getIssueKey() != null ? saved.getIssueKey() : saved.getId();
            String titleKey = saved.getIssueKey() != null ? saved.getIssueKey() : (saved.getSummary() != null ? saved.getSummary() : "Issue");
            CreateNotificationRequest req = new CreateNotificationRequest();
            req.setType("issue_done");
            req.setTitle("Issue completed: " + titleKey);
            req.setHref("/projects/" + projectKey + "/board?issue=" + (issueRef == null ? "" : issueRef));
            try {
                notificationService.create(developerUser.getId(), req);
            } catch (Exception ignored) {
                // avoid breaking update on notification failures
            }
        });
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
