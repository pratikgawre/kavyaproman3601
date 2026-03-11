package com.team1.backend.controller;

import com.team1.backend.dto.UpdateUserRequest;
import com.team1.backend.dto.UserDto;
import com.team1.backend.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
    @GetMapping("/user")
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
}
