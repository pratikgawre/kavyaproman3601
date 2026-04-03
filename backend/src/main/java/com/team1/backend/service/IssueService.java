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
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

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
        return listAll(project, false);
    }

    public List<Issue> listAll(String project, boolean includeArchived){
        List<Issue> issues;
        if (project == null || project.trim().isEmpty()) {
            issues = repo.findAll();
        } else {
            issues = repo.findByProject(normalizeProjectKey(project));
        }
        if (includeArchived) {
            return issues;
        }
        return issues.stream()
                .filter(issue -> !isArchived(issue))
                .toList();
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
        issue.setSprintId(normalizeText(issue.getSprintId()));
        issue.setArchived(Boolean.FALSE);
        issue.setArchivedAt(null);

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
        if (!canModifyIssue(user, existing)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not allowed");
        }
        String previousAssigneeEmail = normalizeEmail(existing.getAssigneeEmail());
        String previousReviewerEmail = normalizeEmail(existing.getReviewerEmail());
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
        if (updated != null) {
            updated.setCreatorEmail(existing.getCreatorEmail());
            updated.setCreatorName(existing.getCreatorName());
        }
        Issue saved = update(id, updated);
        notifyIssueUpdate(user, saved, previousAssigneeEmail, previousReviewerEmail, previousStatus);
        if (!previousStatus.equals(nextStatus)) {
            maybeNotifyTestersOnReview(user, nextStatus, saved);
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
            if (updated.getSprintId() != null) {
                existing.setSprintId(normalizeText(updated.getSprintId()));
            }
            if (updated.getArchived() != null) {
                existing.setArchived(updated.getArchived());
            }
            if (updated.getArchivedAt() != null) {
                existing.setArchivedAt(updated.getArchivedAt());
            }
            existing.setUpdatedAt(LocalDateTime.now());
            return repo.save(existing);
        }).orElseGet(() -> {
            updated.setId(id);
            if (updated.getArchived() == null) {
                updated.setArchived(Boolean.FALSE);
            }
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
        Issue saved = repo.save(existing);
        notifyCommentActivity(user, saved, comment);
        return saved;
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

        String requestedReviewer = updated != null ? normalizeEmail(updated.getReviewerEmail()) : null;
        if (requestedReviewer != null && !requestedReviewer.isEmpty()) {
            if (actorEmail == null || actorEmail.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Missing tester identity");
            }
            if (!requestedReviewer.equalsIgnoreCase(actorEmail)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tester can only assign themselves");
            }
        }

        int testerCount = countProjectTesters(existing.getProject());
        if (testerCount > 1) {
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

    private void maybeNotifyTestersOnReview(User actor, String nextStatus, Issue saved) {
        if (notificationService == null || actor == null || saved == null) return;
        if (!"review".equals(nextStatus)) return;
        String reviewerEmail = normalizeEmail(saved.getReviewerEmail());
        if (reviewerEmail != null && !reviewerEmail.isEmpty()) return;

        String projectKey = normalizeProjectKey(saved.getProject());
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
                String titleKey = saved.getIssueKey() != null ? saved.getIssueKey() : (saved.getSummary() != null ? saved.getSummary() : "Issue");
                req.setType("issue_review");
                req.setTitle("Review needed: " + titleKey);
                req.setHref(buildIssueHref(saved));
                try {
                    notificationService.create(testerUser.getId(), req);
                } catch (Exception ignored) {
                    // avoid breaking update on notification failures
                }
            });
        }
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

    private void notifyIssueUpdate(
            User actor,
            Issue saved,
            String previousAssigneeEmail,
            String previousReviewerEmail,
            String previousStatus
    ) {
        if (notificationService == null || actor == null || saved == null) {
            return;
        }

        String issueHref = buildIssueHref(saved);
        String currentAssigneeEmail = normalizeEmail(saved.getAssigneeEmail());
        if (currentAssigneeEmail != null
                && !sameEmail(currentAssigneeEmail, previousAssigneeEmail)
                && !sameEmail(currentAssigneeEmail, actor.getEmail())) {
            notifyUserByEmail(
                    currentAssigneeEmail,
                    "issue_assigned",
                    "You were assigned: " + getIssueDisplayLabel(saved),
                    issueHref
            );
        }

        String currentReviewerEmail = normalizeEmail(saved.getReviewerEmail());
        if (currentReviewerEmail != null
                && !sameEmail(currentReviewerEmail, previousReviewerEmail)
                && !sameEmail(currentReviewerEmail, actor.getEmail())) {
            notifyUserByEmail(
                    currentReviewerEmail,
                    "issue_assigned",
                    "You were assigned to review: " + getIssueDisplayLabel(saved),
                    issueHref
            );
        }

        String currentStatus = normalizeStatus(saved.getStatus());
        if (!sameText(currentStatus, previousStatus)) {
            Set<String> recipients = new LinkedHashSet<>();
            addRecipientEmail(recipients, saved.getCreatorEmail(), actor.getEmail());
            addRecipientEmail(recipients, currentAssigneeEmail, actor.getEmail());
            addRecipientEmail(recipients, currentReviewerEmail, actor.getEmail());
            String title = "Status changed: " + getIssueDisplayLabel(saved) + " is now " + formatStatusLabel(currentStatus);
            for (String recipientEmail : recipients) {
                notifyUserByEmail(recipientEmail, "status_changed", title, issueHref);
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
                buildIssueHref(saved)
        );
    }

    private void notifyCommentActivity(User actor, Issue issue, IssueComment comment) {
        if (notificationService == null || actor == null || issue == null || comment == null) {
            return;
        }

        String issueLabel = getIssueDisplayLabel(issue);
        String issueHref = buildIssueHref(issue);
        String actorName = normalizeText(actor.getName()) != null ? actor.getName().trim() : actor.getEmail();

        Set<String> mentionedEmails = findMentionedRecipientEmails(issue, comment.getMessage(), actor.getEmail());
        for (String mentionedEmail : mentionedEmails) {
            notifyUserByEmail(
                    mentionedEmail,
                    "mention",
                    actorName + " mentioned you on " + issueLabel,
                    issueHref
            );
        }

        Set<String> commentRecipients = new LinkedHashSet<>();
        addRecipientEmail(commentRecipients, issue.getCreatorEmail(), actor.getEmail());
        addRecipientEmail(commentRecipients, issue.getAssigneeEmail(), actor.getEmail());
        addRecipientEmail(commentRecipients, issue.getReviewerEmail(), actor.getEmail());
        commentRecipients.removeAll(mentionedEmails);

        for (String recipientEmail : commentRecipients) {
            notifyUserByEmail(
                    recipientEmail,
                    "comment",
                    actorName + " commented on " + issueLabel,
                    issueHref
            );
        }
    }

    private Set<String> findMentionedRecipientEmails(Issue issue, String message, String actorEmail) {
        Set<String> mentionedEmails = new LinkedHashSet<>();
        String trimmedMessage = message == null ? "" : message.trim();
        if (issue == null || trimmedMessage.isEmpty()) {
            return mentionedEmails;
        }

        addMentionedEmail(mentionedEmails, trimmedMessage, actorEmail, issue.getCreatorEmail(), issue.getCreatorName());
        addMentionedEmail(mentionedEmails, trimmedMessage, actorEmail, issue.getAssigneeEmail(), issue.getAssigneeName());
        addMentionedEmail(mentionedEmails, trimmedMessage, actorEmail, issue.getReviewerEmail(), issue.getReviewerName());

        String projectKey = normalizeProjectKey(issue.getProject());
        projectRepository.findByProjectKeyIgnoreCase(projectKey)
                .map(Project::getTeamMembers)
                .orElse(List.of())
                .forEach((member) -> {
                    if (member == null) {
                        return;
                    }
                    addMentionedEmail(mentionedEmails, trimmedMessage, actorEmail, member.getEmail(), member.getName());
                });

        return mentionedEmails;
    }

    private void addMentionedEmail(
            Set<String> recipients,
            String message,
            String actorEmail,
            String candidateEmail,
            String candidateName
    ) {
        String normalizedCandidateEmail = normalizeEmail(candidateEmail);
        if (normalizedCandidateEmail == null || sameEmail(normalizedCandidateEmail, actorEmail)) {
            return;
        }
        if (messageContainsMention(message, normalizedCandidateEmail, candidateName)) {
            recipients.add(normalizedCandidateEmail);
        }
    }

    private boolean messageContainsMention(String message, String email, String name) {
        for (String alias : buildMentionAliases(email, name)) {
            if (containsMentionAlias(message, alias)) {
                return true;
            }
        }
        return false;
    }

    private Set<String> buildMentionAliases(String email, String name) {
        Set<String> aliases = new LinkedHashSet<>();

        String normalizedEmail = normalizeEmail(email);
        if (normalizedEmail != null) {
            aliases.add(normalizedEmail);
            int atIndex = normalizedEmail.indexOf('@');
            if (atIndex > 0) {
                String localPart = normalizedEmail.substring(0, atIndex);
                aliases.add(localPart);
                aliases.add(localPart.replace(".", ""));
                aliases.add(localPart.replace(".", "-"));
                aliases.add(localPart.replace(".", "_"));
            }
        }

        String normalizedName = normalizeText(name);
        if (normalizedName != null) {
            String lowerName = normalizedName.toLowerCase().replaceAll("\\s+", " ").trim();
            aliases.add(lowerName);
            aliases.add(lowerName.replace(" ", ""));
            aliases.add(lowerName.replace(" ", "-"));
            aliases.add(lowerName.replace(" ", "_"));
            aliases.add(lowerName.replace(" ", "."));
        }

        aliases.removeIf((alias) -> alias == null || alias.isBlank());
        return aliases;
    }

    private boolean containsMentionAlias(String message, String alias) {
        if (message == null || message.isBlank() || alias == null || alias.isBlank()) {
            return false;
        }

        String normalizedAlias = alias.trim().toLowerCase();
        StringBuilder regex = new StringBuilder("(?i)(?<![\\w@])@");
        for (char ch : normalizedAlias.toCharArray()) {
            if (Character.isWhitespace(ch)) {
                regex.append("\\s+");
            } else {
                regex.append(Pattern.quote(String.valueOf(ch)));
            }
        }
        regex.append("(?![\\w])");
        return Pattern.compile(regex.toString()).matcher(message).find();
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

    private String buildIssueHref(Issue issue) {
        if (issue == null) {
            return "/all-my-issues";
        }
        String projectKey = normalizeProjectKey(issue.getProject());
        String issueRef = issue.getIssueKey() != null && !issue.getIssueKey().isBlank()
                ? issue.getIssueKey().trim()
                : issue.getId();
        if (issueRef == null || issueRef.isBlank()) {
            return "/projects/" + projectKey + "/board";
        }
        return "/projects/" + projectKey + "/board?issue=" + issueRef;
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

    private boolean isArchived(Issue issue) {
        return issue != null && Boolean.TRUE.equals(issue.getArchived());
    }
}
