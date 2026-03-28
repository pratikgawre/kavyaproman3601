package com.team1.backend.service;

import com.team1.backend.model.Issue;
import com.team1.backend.model.Sprint;
import com.team1.backend.repository.IssueRepository;
import com.team1.backend.repository.SprintRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class SprintService {

    private final SprintRepository sprintRepository;
    private final IssueRepository issueRepository;

    private static final String UNASSIGNED_LABEL = "Unassigned";

    public SprintService(SprintRepository sprintRepository, IssueRepository issueRepository) {
        this.sprintRepository = sprintRepository;
        this.issueRepository = issueRepository;
    }

    public List<Sprint> list(String projectKey) {
        List<Sprint> sprints;
        if (projectKey == null || projectKey.trim().isEmpty()) {
            sprints = sprintRepository.findAll();
        } else {
            sprints = sprintRepository.findByProjectKeyIgnoreCase(normalizeProjectKey(projectKey));
        }
        sprints.sort(this::compareSprints);
        attachIssueSummaries(sprints);
        return sprints;
    }

    public Sprint create(Sprint sprint) {
        if (sprint == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Sprint payload is required");
        }
        String projectKey = normalizeProjectKey(sprint.getProjectKey());
        if (projectKey == null || projectKey.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Project key is required");
        }
        String name = normalizeText(sprint.getName());
        if (name == null || name.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Sprint name is required");
        }

        sprint.setProjectKey(projectKey);
        sprint.setName(name);
        sprint.setGoal(normalizeText(sprint.getGoal()));
        sprint.setStatus(normalizeStatus(sprint.getStatus()));
        sprint.setStartDate(normalizeText(sprint.getStartDate()));
        sprint.setEndDate(normalizeText(sprint.getEndDate()));

        if ("active".equals(sprint.getStatus())) {
            ensureNoOtherActive(projectKey, null);
        }

        sprint.setCreatedAt(LocalDateTime.now());
        sprint.setUpdatedAt(LocalDateTime.now());
        Sprint saved = sprintRepository.save(sprint);
        attachIssueSummary(saved);
        return saved;
    }

    public Sprint update(String id, Sprint updated) {
        Sprint existing = sprintRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sprint not found"));

        if (updated.getProjectKey() != null) {
            String normalized = normalizeProjectKey(updated.getProjectKey());
            if (normalized != null && !normalized.isEmpty()) {
                existing.setProjectKey(normalized);
            }
        }
        if (updated.getName() != null) {
            String normalized = normalizeText(updated.getName());
            if (normalized != null && !normalized.isEmpty()) {
                existing.setName(normalized);
            }
        }
        if (updated.getGoal() != null) {
            existing.setGoal(normalizeText(updated.getGoal()));
        }
        if (updated.getStatus() != null) {
            String nextStatus = normalizeStatus(updated.getStatus());
            if ("active".equals(nextStatus)) {
                ensureNoOtherActive(existing.getProjectKey(), existing.getId());
            }
            existing.setStatus(nextStatus);
        }
        if (updated.getStartDate() != null) {
            existing.setStartDate(normalizeText(updated.getStartDate()));
        }
        if (updated.getEndDate() != null) {
            existing.setEndDate(normalizeText(updated.getEndDate()));
        }
        if (updated.getOrder() != null) {
            existing.setOrder(updated.getOrder());
        }

        existing.setUpdatedAt(LocalDateTime.now());
        Sprint saved = sprintRepository.save(existing);
        attachIssueSummary(saved);
        return saved;
    }

    public Sprint startSprint(String id) {
        Sprint sprint = sprintRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sprint not found"));
        String projectKey = normalizeProjectKey(sprint.getProjectKey());
        ensureNoOtherActive(projectKey, sprint.getId());
        sprint.setStatus("active");
        if (sprint.getStartDate() == null || sprint.getStartDate().isBlank()) {
            sprint.setStartDate(LocalDate.now().toString());
        }
        sprint.setUpdatedAt(LocalDateTime.now());
        Sprint saved = sprintRepository.save(sprint);
        attachIssueSummary(saved);
        return saved;
    }

    public Sprint completeSprint(String id) {
        Sprint sprint = sprintRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sprint not found"));
        sprint.setStatus("completed");
        if (sprint.getEndDate() == null || sprint.getEndDate().isBlank()) {
            sprint.setEndDate(LocalDate.now().toString());
        }
        sprint.setUpdatedAt(LocalDateTime.now());
        Sprint saved = sprintRepository.save(sprint);
        attachIssueSummary(saved);
        return saved;
    }

    private void ensureNoOtherActive(String projectKey, String currentId) {
        if (projectKey == null || projectKey.isBlank()) return;
        Optional<Sprint> existing = sprintRepository.findFirstByProjectKeyIgnoreCaseAndStatus(projectKey, "active");
        if (existing.isEmpty()) return;
        if (currentId != null && currentId.equals(existing.get().getId())) return;
        throw new ResponseStatusException(HttpStatus.CONFLICT, "Another sprint is already active");
    }

    private int compareSprints(Sprint left, Sprint right) {
        if (left == null && right == null) return 0;
        if (left == null) return 1;
        if (right == null) return -1;

        Integer leftOrder = left.getOrder();
        Integer rightOrder = right.getOrder();
        if (leftOrder != null || rightOrder != null) {
            int orderCmp = compareNullable(leftOrder, rightOrder);
            if (orderCmp != 0) return orderCmp;
        }

        LocalDateTime leftCreated = left.getCreatedAt();
        LocalDateTime rightCreated = right.getCreatedAt();
        if (leftCreated != null || rightCreated != null) {
            int dateCmp = compareNullable(leftCreated, rightCreated);
            if (dateCmp != 0) return dateCmp;
        }

        String leftName = safeText(left.getName());
        String rightName = safeText(right.getName());
        return leftName.compareToIgnoreCase(rightName);
    }

    private void attachIssueSummary(Sprint sprint) {
        if (sprint == null || sprint.getId() == null || sprint.getId().isBlank()) {
            if (sprint != null) {
                sprint.setIssueCount(0);
                sprint.setIssueSummary(List.of());
                sprint.setIssueStatusCounts(Map.of());
                sprint.setAssigneeCounts(Map.of());
            }
            return;
        }
        List<Issue> issues = issueRepository.findBySprintId(sprint.getId());
        List<Sprint.SprintIssueInfo> summary = buildIssueSummary(issues);
        sprint.setIssueSummary(summary);
        sprint.setIssueCount(summary.size());
        sprint.setIssueStatusCounts(buildIssueStatusCounts(issues));
        sprint.setAssigneeCounts(buildAssigneeCounts(issues));
    }

    private void attachIssueSummaries(List<Sprint> sprints) {
        if (sprints == null || sprints.isEmpty()) return;
        
        // Extract valid sprint IDs using Stream API for better readability
        List<String> sprintIds = sprints.stream()
                .filter(Objects::nonNull)
                .map(Sprint::getId)
                .filter(id -> id != null && !id.isBlank())
                .toList();
        
        if (sprintIds.isEmpty()) {
            sprints.forEach(sprint -> {
                if (sprint != null) {
                    sprint.setIssueCount(0);
                    sprint.setIssueSummary(List.of());
                    sprint.setIssueStatusCounts(Map.of());
                    sprint.setAssigneeCounts(Map.of());
                }
            });
            return;
        }
        
        List<Issue> issues = issueRepository.findBySprintIdIn(sprintIds);
        Map<String, List<Issue>> issuesBySprint = new HashMap<>();
        for (Issue issue : issues) {
            if (issue == null) continue;
            String issueSprintId = normalizeText(issue.getSprintId());
            if (issueSprintId == null || issueSprintId.isBlank()) continue;
            issuesBySprint.computeIfAbsent(issueSprintId, key -> new ArrayList<>()).add(issue);
        }
        
        sprints.forEach(sprint -> {
            if (sprint == null) return;
            String sprintId = sprint.getId();
            List<Issue> sprintIssues = sprintId != null ? issuesBySprint.get(sprintId) : null;
            List<Sprint.SprintIssueInfo> summary = buildIssueSummary(sprintIssues);
            sprint.setIssueSummary(summary);
            sprint.setIssueCount(summary.size());
            sprint.setIssueStatusCounts(buildIssueStatusCounts(sprintIssues));
            sprint.setAssigneeCounts(buildAssigneeCounts(sprintIssues));
        });
    }

    private List<Sprint.SprintIssueInfo> buildIssueSummary(List<Issue> issues) {
        if (issues == null || issues.isEmpty()) return List.of();
        return issues.stream()
                .filter(Objects::nonNull)
                .map(this::toSprintIssueInfo)
                .toList();
    }

    private Sprint.SprintIssueInfo toSprintIssueInfo(Issue issue) {
        Sprint.SprintIssueInfo info = new Sprint.SprintIssueInfo();
        info.setIssueId(issue.getId());
        info.setIssueKey(normalizeText(issue.getIssueKey()));
        info.setStatus(normalizeIssueStatus(issue.getStatus()));
        info.setAssigneeName(normalizeText(issue.getAssigneeName()));
        info.setAssigneeEmail(normalizeEmail(issue.getAssigneeEmail()));
        return info;
    }

    private Map<String, Integer> buildIssueStatusCounts(List<Issue> issues) {
        if (issues == null || issues.isEmpty()) return Map.of();
        Map<String, Integer> counts = new LinkedHashMap<>();
        for (Issue issue : issues) {
            if (issue == null) continue;
            String status = normalizeIssueStatus(issue.getStatus());
            counts.put(status, counts.getOrDefault(status, 0) + 1);
        }
        return counts;
    }

    private Map<String, Integer> buildAssigneeCounts(List<Issue> issues) {
        if (issues == null || issues.isEmpty()) return Map.of();
        Map<String, Integer> counts = new LinkedHashMap<>();
        for (Issue issue : issues) {
            if (issue == null) continue;
            String assignee = resolveAssignee(issue);
            if (assignee == null || assignee.isBlank()) continue;
            counts.put(assignee, counts.getOrDefault(assignee, 0) + 1);
        }
        return counts;
    }

    private String resolveAssignee(Issue issue) {
        String assignee = normalizeText(issue.getAssigneeName());
        if (assignee == null || assignee.isBlank()) {
            assignee = normalizeEmail(issue.getAssigneeEmail());
        }
        if (assignee == null || assignee.isBlank()) {
            assignee = UNASSIGNED_LABEL;
        }
        return assignee;
    }

    private <T extends Comparable<T>> int compareNullable(T left, T right) {
        if (left == null && right == null) return 0;
        if (left == null) return 1;
        if (right == null) return -1;
        return left.compareTo(right);
    }

    private String safeText(String value) {
        return value == null ? "" : value;
    }

    private String normalizeProjectKey(String value) {
        if (value == null) return null;
        String trimmed = value.trim().toUpperCase();
        return trimmed.isEmpty() ? null : trimmed;
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

    private String normalizeIssueStatus(String status) {
        if (status == null) return "todo";
        String normalized = status.trim().toLowerCase();
        return switch (normalized) {
            case "todo", "to-do" -> "todo";
            case "progress", "in-progress", "in progress" -> "progress";
            case "review", "in-review", "in review" -> "review";
            case "done", "completed" -> "done";
            default -> "todo";
        };
    }

    private String normalizeStatus(String status) {
        if (status == null) return "planned";
        String normalized = status.trim().toLowerCase();
        return switch (normalized) {
            case "active", "started", "in-progress", "in progress" -> "active";
            case "completed", "complete", "done" -> "completed";
            default -> "planned";
        };
    }
}
