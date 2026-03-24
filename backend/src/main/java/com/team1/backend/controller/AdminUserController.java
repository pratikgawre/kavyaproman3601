package com.team1.backend.controller;

import com.team1.backend.dto.AdminUserDto;
import com.team1.backend.model.User;
import com.team1.backend.repository.UserRepository;
import com.team1.backend.service.AdminUserService;
import com.team1.backend.dto.RoleUpdateRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
public class AdminUserController {

    private final AdminUserService adminUserService;
    private final UserRepository userRepository;

    public AdminUserController(AdminUserService adminUserService, UserRepository userRepository) {
        this.adminUserService = adminUserService;
        this.userRepository = userRepository;
    }

    @GetMapping("/users")
    public ResponseEntity<List<AdminUserDto>> listUsers(@RequestHeader("X-USER-ID") String userId,
                                                        @RequestParam(defaultValue = "16") int limit) {
        validateAdmin(userId);
        List<AdminUserDto> users = adminUserService.listUsers(Math.max(1, limit));
        return ResponseEntity.ok(users);
    }

    @PatchMapping("/users/{targetUserId}/role")
    public ResponseEntity<AdminUserDto> updateUserRole(@RequestHeader("X-USER-ID") String userId,
                                                       @PathVariable String targetUserId,
                                                       @RequestBody RoleUpdateRequest request) {
        validateAdmin(userId);
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing request body");
        }
        AdminUserDto updated = adminUserService.updateUserRole(targetUserId, request.getRole());
        return ResponseEntity.ok(updated);
    }

    private void validateAdmin(String userId) {
        if (userId == null || userId.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing X-USER-ID");
        }
        User user = userRepository.findById(userId.trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
        if (!"admin".equalsIgnoreCase(user.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access required");
        }
    }
}
