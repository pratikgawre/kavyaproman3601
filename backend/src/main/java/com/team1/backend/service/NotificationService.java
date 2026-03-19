package com.team1.backend.service;

import com.team1.backend.dto.CreateNotificationRequest;
import com.team1.backend.dto.NotificationPreferencesDto;
import com.team1.backend.dto.NotificationDto;
import com.team1.backend.model.Notification;
import com.team1.backend.model.User;
import com.team1.backend.repository.NotificationRepository;
import com.team1.backend.repository.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class NotificationService {

    private static final int DEFAULT_LIMIT = 50;
    private static final int MAX_LIMIT = 200;

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public NotificationService(NotificationRepository notificationRepository, UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }

    public List<NotificationDto> listMine(String userId, Integer limit) {
        User user = requireUser(userId);
        int size = DEFAULT_LIMIT;
        if (limit != null && limit > 0) {
            size = Math.min(limit, MAX_LIMIT);
        }
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(0, size))
                .stream()
                .filter(notification -> isEnabledForType(user, notification.getType()))
                .map(this::toDto)
                .toList();
    }

    public NotificationDto create(String userId, CreateNotificationRequest req) {
        User user = requireUser(userId);
        if (!isEnabledForType(user, req.getType())) {
            return null;
        }
        Notification n = new Notification();
        n.setUserId(userId);
        n.setTitle(req.getTitle() == null ? "" : req.getTitle().trim());
        n.setType(req.getType() == null ? null : req.getType().trim());
        n.setHref(req.getHref() == null ? null : req.getHref().trim());
        n.setRead(false);
        n.setCreatedAt(LocalDateTime.now());
        return toDto(notificationRepository.save(n));
    }

    public NotificationDto markRead(String userId, String id) {
        requireUser(userId);
        Notification n = notificationRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found"));
        if (!n.isRead()) {
            n.setRead(true);
            n.setReadAt(LocalDateTime.now());
            n = notificationRepository.save(n);
        }
        return toDto(n);
    }

    public void delete(String userId, String id) {
        requireUser(userId);
        Notification n = notificationRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found"));
        notificationRepository.delete(n);
    }

    public long clearAll(String userId) {
        requireUser(userId);
        return notificationRepository.deleteByUserId(userId);
    }

    private NotificationDto toDto(Notification n) {
        return new NotificationDto(
                n.getId(),
                n.getTitle(),
                n.getType(),
                n.getHref(),
                n.isRead(),
                n.getCreatedAt()
        );
    }

    private User requireUser(String userId) {
        if (userId == null || userId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing X-USER-ID");
        }
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid user"));
    }

    private boolean isEnabledForType(User user, String type) {
        NotificationPreferencesDto prefs = toPreferencesDto(user);
        String normalizedType = normalizeType(type);
        return switch (normalizedType) {
            case "email", "email-notification", "email-notifications" -> prefs.isEmailNotifications();
            case "issue-assigned", "issue-assignment", "issue-assignments", "assignment" -> prefs.isIssueAssignments();
            case "mention", "mentions" -> prefs.isMentions();
            case "comment", "comments" -> prefs.isComments();
            case "status-change", "status-changed", "status-changes" -> prefs.isStatusChanges();
            case "weekly-summary" -> prefs.isWeeklySummary();
            default -> true;
        };
    }

    private NotificationPreferencesDto toPreferencesDto(User user) {
        if (user == null || user.getNotificationPreferences() == null) {
            return new NotificationPreferencesDto();
        }
        return new NotificationPreferencesDto(
                user.getNotificationPreferences().isEmailNotifications(),
                user.getNotificationPreferences().isIssueAssignments(),
                user.getNotificationPreferences().isMentions(),
                user.getNotificationPreferences().isComments(),
                user.getNotificationPreferences().isStatusChanges(),
                user.getNotificationPreferences().isWeeklySummary()
        );
    }

    private String normalizeType(String type) {
        String raw = type == null ? "" : type.trim().toLowerCase();
        if (raw.isEmpty()) {
            return "generic";
        }
        return raw
                .replace('_', '-')
                .replaceAll("\\s+", "-")
                .replaceAll("[^a-z0-9-]", "")
                .replaceAll("-{2,}", "-");
    }
}

