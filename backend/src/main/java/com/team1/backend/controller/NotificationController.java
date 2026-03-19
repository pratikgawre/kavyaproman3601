package com.team1.backend.controller;

import com.team1.backend.dto.CreateNotificationRequest;
import com.team1.backend.dto.NotificationDto;
import com.team1.backend.service.NotificationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public List<NotificationDto> list(
            @RequestHeader("X-USER-ID") String userId,
            @RequestParam(value = "limit", required = false) Integer limit
    ) {
        return notificationService.listMine(userId, limit);
    }

    @PostMapping
    public ResponseEntity<NotificationDto> create(
            @RequestHeader("X-USER-ID") String userId,
            @Valid @RequestBody CreateNotificationRequest req
    ) {
        NotificationDto created = notificationService.create(userId, req);
        if (created == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}/read")
    public NotificationDto markRead(
            @RequestHeader("X-USER-ID") String userId,
            @PathVariable String id
    ) {
        return notificationService.markRead(userId, id);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @RequestHeader("X-USER-ID") String userId,
            @PathVariable String id
    ) {
        notificationService.delete(userId, id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping
    public ResponseEntity<Void> clearAll(@RequestHeader("X-USER-ID") String userId) {
        notificationService.clearAll(userId);
        return ResponseEntity.noContent().build();
    }
}

