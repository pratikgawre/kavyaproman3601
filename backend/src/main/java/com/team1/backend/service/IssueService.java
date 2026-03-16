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

    public List<Issue> listMine(String userId){
        User user = requireUser(userId);
        return repo.findByCreatorEmailIgnoreCase(user.getEmail());
    }

    public Optional<Issue> findMineById(String userId, String id){
        User user = requireUser(userId);
        return repo.findByIdAndCreatorEmailIgnoreCase(id, user.getEmail());
    }

    public Issue create(String userId, Issue issue){
        User user = requireUser(userId);
        issue.setCreatorEmail(user.getEmail());
        issue.setCreatorName(user.getName());
        issue.setCreatedAt(LocalDateTime.now());
        issue.setUpdatedAt(LocalDateTime.now());
        Issue saved = repo.save(issue);
        notifyUser(userId, "Issue created: " + safeSummary(saved), "issue_created", "/all-my-issues?q=" + saved.getId());
        return saved;
    }

    public Issue update(String userId, String id, Issue updated){
        User user = requireUser(userId);
        Issue existing = repo.findByIdAndCreatorEmailIgnoreCase(id, user.getEmail())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Issue not found"));

        existing.setProject(updated.getProject());
        existing.setIssueType(updated.getIssueType());
        existing.setEpicName(updated.getEpicName());
        existing.setSummary(updated.getSummary());
        existing.setDescription(updated.getDescription());
        existing.setAttachmentsJson(updated.getAttachmentsJson());
        existing.setDifficulty(updated.getDifficulty());
        existing.setUpdatedAt(LocalDateTime.now());
        Issue saved = repo.save(existing);
        notifyUser(userId, "Issue updated: " + safeSummary(saved), "issue_updated", "/all-my-issues?q=" + saved.getId());
        return saved;
    }

    public void delete(String userId, String id){
        User user = requireUser(userId);
        Issue existing = repo.findByIdAndCreatorEmailIgnoreCase(id, user.getEmail())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Issue not found"));
        String summary = safeSummary(existing);
        repo.delete(existing);
        notifyUser(userId, "Issue deleted: " + summary, "issue_deleted", "/all-my-issues");
    }

    private void notifyUser(String userId, String title, String type, String href) {
        try {
            CreateNotificationRequest req = new CreateNotificationRequest();
            req.setTitle(title);
            req.setType(type);
            req.setHref(href);
            notificationService.create(userId, req);
        } catch (Exception ignored) {
        }
    }

    private String safeSummary(Issue issue) {
        String summary = issue == null ? "" : issue.getSummary();
        String trimmed = summary == null ? "" : summary.trim();
        if (!trimmed.isBlank()) return trimmed;
        return issue == null ? "" : ("#" + issue.getId());
    }

    private User requireUser(String userId) {
        if (userId == null || userId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing X-USER-ID");
        }
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid user"));
    }
}
