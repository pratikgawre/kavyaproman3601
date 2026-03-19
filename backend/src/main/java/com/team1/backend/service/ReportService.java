package com.team1.backend.service;

import com.team1.backend.dto.ReportResponse;
import com.team1.backend.model.Issue;
import com.team1.backend.repository.IssueRepository;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class ReportService {

    private static final int HOURS_PER_POINT = 8;
    private static final int VELOCITY_WEEKS = 6;
    private static final int BURNDOWN_DAYS = 7;
    private static final DateTimeFormatter SHORT_DATE_FORMATTER = DateTimeFormatter.ofPattern("MMM d", Locale.ENGLISH);

    private final IssueRepository issueRepository;

    public ReportService(IssueRepository issueRepository) {
        this.issueRepository = issueRepository;
    }

    public ReportResponse getProjectReport(String project, String userEmail, String role) {
        ReportResponse response = new ReportResponse();
        String normalizedProject = normalizeProjectKey(project);
        if (normalizedProject == null) {
            return response;
        }

        List<Issue> visibleIssues = filterVisibleIssues(
                issueRepository.findByProject(normalizedProject),
                normalizeEmail(userEmail),
                normalizeRole(role)
        );

        response.setSummary(buildSummary(visibleIssues));
        response.setVelocityData(buildVelocityData(visibleIssues));
        response.setBurndownData(buildBurndownData(visibleIssues));
        response.setIssueTypeDistributionData(buildIssueTypeDistributionData(visibleIssues));
        response.setStatusDistributionData(buildStatusDistributionData(visibleIssues));
        return response;
    }

    private List<Issue> filterVisibleIssues(List<Issue> issues, String userEmail, String role) {
        if (issues == null || issues.isEmpty()) {
            return new ArrayList<>();
        }
        if (isProjectManager(role) || userEmail == null) {
            return new ArrayList<>(issues);
        }

        List<Issue> filtered = new ArrayList<>();
        for (Issue issue : issues) {
            String visibleEmail = firstNonBlank(normalizeEmail(issue.getAssigneeEmail()), normalizeEmail(issue.getCreatorEmail()));
            if (visibleEmail != null && visibleEmail.equals(userEmail)) {
                filtered.add(issue);
            }
        }
        return filtered;
    }

    private ReportResponse.Summary buildSummary(List<Issue> issues) {
        ReportResponse.Summary summary = new ReportResponse.Summary();
        int totalIssues = issues.size();
        int completedIssues = 0;
        int totalPoints = 0;
        double loggedHours = 0;

        for (Issue issue : issues) {
            int points = issuePoints(issue);
            String status = normalizeStatus(issue.getStatus());
            totalPoints += points;
            if ("done".equals(status)) {
                completedIssues += 1;
                loggedHours += points * HOURS_PER_POINT;
            } else if ("review".equals(status)) {
                loggedHours += points * HOURS_PER_POINT * 0.8d;
            } else if ("progress".equals(status)) {
                loggedHours += points * HOURS_PER_POINT * 0.5d;
            }
        }

        summary.setTotalIssues(totalIssues);
        summary.setCompletedIssues(completedIssues);
        summary.setCompletionRate(totalIssues > 0 ? Math.round((completedIssues * 100f) / totalIssues) : 0);
        summary.setTotalPoints(totalPoints);
        summary.setEstimatedHours(totalPoints * HOURS_PER_POINT);
        summary.setLoggedHours((int) Math.round(loggedHours));
        return summary;
    }

    private List<ReportResponse.VelocityPoint> buildVelocityData(List<Issue> issues) {
        LocalDate currentWeekStart = startOfWeek(LocalDate.now());
        Map<LocalDate, ReportResponse.VelocityPoint> buckets = new LinkedHashMap<>();

        for (int offset = VELOCITY_WEEKS - 1; offset >= 0; offset -= 1) {
            LocalDate weekStart = currentWeekStart.minusWeeks(offset);
            buckets.put(weekStart, new ReportResponse.VelocityPoint(formatShortDate(weekStart), 0));
        }

        for (Issue issue : issues) {
            if (!"done".equals(normalizeStatus(issue.getStatus()))) {
                continue;
            }
            LocalDate completionDate = resolveIssueDate(issue.getUpdatedAt(), issue.getCreatedAt());
            if (completionDate == null) {
                continue;
            }
            ReportResponse.VelocityPoint bucket = buckets.get(startOfWeek(completionDate));
            if (bucket != null) {
                bucket.setPoints(bucket.getPoints() + issuePoints(issue));
            }
        }

        return new ArrayList<>(buckets.values());
    }

    private List<ReportResponse.BurndownPoint> buildBurndownData(List<Issue> issues) {
        List<ReportResponse.BurndownPoint> series = new ArrayList<>();
        LocalDate today = LocalDate.now();

        for (int offset = BURNDOWN_DAYS - 1; offset >= 0; offset -= 1) {
            LocalDate day = today.minusDays(offset);
            LocalDateTime dayEnd = day.atTime(LocalTime.MAX);
            int remaining = 0;

            for (Issue issue : issues) {
                LocalDateTime createdAt = firstNonNull(issue.getCreatedAt(), issue.getUpdatedAt());
                if (createdAt != null && createdAt.isAfter(dayEnd)) {
                    continue;
                }

                int points = issuePoints(issue);
                if (!"done".equals(normalizeStatus(issue.getStatus()))) {
                    remaining += points;
                    continue;
                }

                LocalDateTime completedAt = firstNonNull(issue.getUpdatedAt(), createdAt);
                if (completedAt == null || completedAt.isAfter(dayEnd)) {
                    remaining += points;
                }
            }

            series.add(new ReportResponse.BurndownPoint(formatShortDate(day), remaining));
        }

        return series;
    }

    private List<ReportResponse.IssueTypeDistributionPoint> buildIssueTypeDistributionData(List<Issue> issues) {
        Map<String, Integer> counts = new LinkedHashMap<>();
        for (Issue issue : issues) {
            String normalized = normalizeIssueType(issue.getIssueType());
            String label = capitalize(normalized);
            counts.put(label, counts.getOrDefault(label, 0) + 1);
        }

        List<ReportResponse.IssueTypeDistributionPoint> result = new ArrayList<>();
        List<String> preferred = List.of("Story", "Task", "Bug", "Epic");

        for (String label : preferred) {
            Integer count = counts.remove(label);
            if (count != null) {
                result.add(new ReportResponse.IssueTypeDistributionPoint(label, count));
            }
        }

        counts.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue(Comparator.reverseOrder())
                        .thenComparing(Map.Entry.comparingByKey()))
                .forEach(entry -> result.add(new ReportResponse.IssueTypeDistributionPoint(entry.getKey(), entry.getValue())));

        return result;
    }

    private List<ReportResponse.StatusDistributionPoint> buildStatusDistributionData(List<Issue> issues) {
        Map<String, Integer> buckets = new LinkedHashMap<>();
        buckets.put("todo", 0);
        buckets.put("progress", 0);
        buckets.put("review", 0);
        buckets.put("done", 0);

        for (Issue issue : issues) {
            String normalized = normalizeStatus(issue.getStatus());
            buckets.put(normalized, buckets.getOrDefault(normalized, 0) + 1);
        }

        List<ReportResponse.StatusDistributionPoint> result = new ArrayList<>();
        result.add(new ReportResponse.StatusDistributionPoint("To Do", buckets.getOrDefault("todo", 0)));
        result.add(new ReportResponse.StatusDistributionPoint("In Progress", buckets.getOrDefault("progress", 0)));
        result.add(new ReportResponse.StatusDistributionPoint("In Review", buckets.getOrDefault("review", 0)));
        result.add(new ReportResponse.StatusDistributionPoint("Done", buckets.getOrDefault("done", 0)));
        return result;
    }

    private int issuePoints(Issue issue) {
        if (issue != null && issue.getPoints() != null) {
            return issue.getPoints();
        }
        String difficulty = issue == null ? null : issue.getDifficulty();
        if (difficulty == null) {
            return 5;
        }
        String normalized = difficulty.trim().toLowerCase(Locale.ENGLISH);
        if ("high".equals(normalized)) {
            return 8;
        }
        if ("low".equals(normalized)) {
            return 2;
        }
        return 5;
    }

    private LocalDate resolveIssueDate(LocalDateTime primary, LocalDateTime fallback) {
        LocalDateTime dateTime = firstNonNull(primary, fallback);
        return dateTime == null ? null : dateTime.toLocalDate();
    }

    private LocalDateTime firstNonNull(LocalDateTime primary, LocalDateTime fallback) {
        return primary != null ? primary : fallback;
    }

    private LocalDate startOfWeek(LocalDate date) {
        if (date == null) {
            return null;
        }
        int diff = date.getDayOfWeek().getValue() - DayOfWeek.MONDAY.getValue();
        return date.minusDays(diff);
    }

    private String formatShortDate(LocalDate date) {
        return date.format(SHORT_DATE_FORMATTER);
    }

    private String normalizeProjectKey(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        return value.trim().toUpperCase(Locale.ENGLISH);
    }

    private String normalizeRole(String value) {
        if (value == null) {
            return "";
        }
        return value.trim().toLowerCase(Locale.ENGLISH);
    }

    private String normalizeEmail(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        return value.trim().toLowerCase(Locale.ENGLISH);
    }

    private boolean isProjectManager(String role) {
        return "admin".equals(role) || "project manager".equals(role);
    }

    private String normalizeStatus(String value) {
        if (value == null) {
            return "todo";
        }
        String normalized = value.trim().toLowerCase(Locale.ENGLISH);
        return switch (normalized) {
            case "todo", "to-do" -> "todo";
            case "progress", "in-progress", "in progress" -> "progress";
            case "review", "in-review", "in review" -> "review";
            case "done", "completed" -> "done";
            default -> "todo";
        };
    }

    private String normalizeIssueType(String value) {
        if (value == null || value.trim().isEmpty()) {
            return "task";
        }
        return value.trim().toLowerCase(Locale.ENGLISH);
    }

    private String capitalize(String value) {
        if (value == null || value.isEmpty()) {
            return "Task";
        }
        return Character.toUpperCase(value.charAt(0)) + value.substring(1);
    }

    private String firstNonBlank(String primary, String fallback) {
        if (primary != null && !primary.isBlank()) {
            return primary;
        }
        if (fallback != null && !fallback.isBlank()) {
            return fallback;
        }
        return null;
    }
}
