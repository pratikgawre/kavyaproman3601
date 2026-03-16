package com.team1.backend.service;

import com.team1.backend.dto.UpdateUserRequest;
import com.team1.backend.dto.UserDto;
import com.team1.backend.model.User;
import com.team1.backend.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public UserDto getUserById(String id) {
        User u = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        return toDto(u);
    }

    public UserDto getUserByEmail(String email) {
        if (email == null || email.trim().isEmpty()) {
            return null;
        }
        User u = userRepository.findByEmailIgnoreCase(email.trim().toLowerCase())
                .orElse(null);
        if (u == null) {
            return null;
        }
        return toDto(u);
    }

    public UserDto updateUser(String id, UpdateUserRequest req) {
        User u = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        u.setName(req.getName());
        u.setEmail(req.getEmail());
        if (req.getAvatar() != null) {
            u.setAvatar(req.getAvatar());
        }
        if (req.getRole() != null) {
            u.setRole(req.getRole());
        }
        if (req.getTimezone() != null) {
            u.setTimezone(req.getTimezone());
        }
        userRepository.save(u);
        return toDto(u);
    }

    private UserDto toDto(User u) {
        return new UserDto(
                u.getId(),
                u.getName(),
                u.getEmail(),
                u.getAvatar(),
                u.getRole(),
                u.getTimezone()
        );
    }
}
