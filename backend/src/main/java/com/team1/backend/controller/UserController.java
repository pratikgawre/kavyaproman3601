package com.team1.backend.controller;

import com.team1.backend.dto.NotificationPreferencesDto;
import com.team1.backend.dto.UpdateUserRequest;
import com.team1.backend.dto.UserDto;
import com.team1.backend.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    /**
     * Returns the profile of the "logged-in" user.  In this simple demo we
     * expect a header X-USER-ID containing the user id.  A real
     * application would use JWT or session-based authentication instead.
     */
    @GetMapping({"/user", "/user/me"})
    public ResponseEntity<UserDto> getUser(@RequestHeader("X-USER-ID") String userId) {
        UserDto dto = userService.getUserById(userId);
        return ResponseEntity.ok(dto);
    }

    @PutMapping("/user")
    public ResponseEntity<UserDto> updateUser(
            @RequestHeader("X-USER-ID") String userId,
            @Valid @RequestBody UpdateUserRequest req) {
        UserDto dto = userService.updateUser(userId, req);
        return ResponseEntity.ok(dto);
    }

    @GetMapping("/user/notifications/preferences")
    public ResponseEntity<NotificationPreferencesDto> getNotificationPreferences(
            @RequestHeader("X-USER-ID") String userId) {
        return ResponseEntity.ok(userService.getNotificationPreferences(userId));
    }

    @PutMapping("/user/notifications/preferences")
    public ResponseEntity<NotificationPreferencesDto> updateNotificationPreferences(
            @RequestHeader("X-USER-ID") String userId,
            @RequestBody NotificationPreferencesDto req) {
        return ResponseEntity.ok(userService.updateNotificationPreferences(userId, req));
    }

    /**
     * Verify if an email exists in the database
     * Returns the user data if found, 404 if not found
     */
    @GetMapping("/users/verify-email")
    public ResponseEntity<UserDto> verifyEmail(@RequestParam String email) {
        UserDto userDto = userService.getUserByEmail(email);
        if (userDto != null) {
            return ResponseEntity.ok(userDto);
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/users/search")
    public ResponseEntity<List<UserDto>> searchUsers(
            @RequestParam String query,
            @RequestParam(defaultValue = "8") int limit) {
        List<UserDto> results = userService.searchUsers(query, limit);
        return ResponseEntity.ok(results);
    }
}
