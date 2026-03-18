package com.team1.backend.service;

import com.team1.backend.dto.UpdateUserRequest;
import com.team1.backend.dto.UserDto;
import com.team1.backend.model.User;
import com.team1.backend.repository.UserRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

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

        String nextName = req.getName() == null ? null : req.getName().trim();
        String nextEmail = req.getEmail() == null ? null : req.getEmail().trim().toLowerCase();

        if (nextEmail != null && !nextEmail.equalsIgnoreCase(u.getEmail())) {
            Optional<User> existing = userRepository.findByEmail(nextEmail);
            if (existing.isPresent() && existing.get().getId() != null && !existing.get().getId().equals(u.getId())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already in use");
            }
        }

        u.setName(nextName);
        u.setEmail(nextEmail);
        if (req.getAvatar() != null) {
            u.setAvatar(req.getAvatar());
        }
        if (req.getRole() != null) {
            u.setRole(req.getRole().trim());
        }
        if (req.getTimezone() != null) {
            u.setTimezone(req.getTimezone().trim());
        }
        try {
            userRepository.save(u);
        } catch (DataIntegrityViolationException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already in use");
        }
        return toDto(u);
    }

    private UserDto toDto(User u) {
        return new UserDto(
                u.getId(),
                u.getName(),
                u.getEmail(),
                u.getAvatar(),
                u.getRole(),
                u.getTimezone(),
                u.isTwoFactorEnabled()
        );
    }
}
