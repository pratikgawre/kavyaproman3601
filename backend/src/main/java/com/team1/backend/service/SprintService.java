package com.team1.backend.service;

import com.team1.backend.model.Sprint;
import com.team1.backend.repository.SprintRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class SprintService {

    private final SprintRepository sprintRepository;

    public SprintService(SprintRepository sprintRepository) {
        this.sprintRepository = sprintRepository;
    }

    public List<Sprint> list(String projectKey) {
        List<Sprint> sprints;
        if (projectKey == null || projectKey.trim().isEmpty()) {
            sprints = sprintRepository.findAll();
        } else {
            sprints = sprintRepository.findByProjectKeyIgnoreCase(normalizeProjectKey(projectKey));
        }
        sprints.sort(this::compareSprints);
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
        return sprintRepository.save(sprint);
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
        return sprintRepository.save(existing);
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
        return sprintRepository.save(sprint);
    }

    public Sprint completeSprint(String id) {
        Sprint sprint = sprintRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sprint not found"));
        sprint.setStatus("completed");
        if (sprint.getEndDate() == null || sprint.getEndDate().isBlank()) {
            sprint.setEndDate(LocalDate.now().toString());
        }
        sprint.setUpdatedAt(LocalDateTime.now());
        return sprintRepository.save(sprint);
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
