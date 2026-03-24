package com.team1.backend.service;

import com.team1.backend.dto.AdminUserDto;
import com.team1.backend.model.User;
import com.team1.backend.repository.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class AdminUserService {

    private final UserRepository userRepository;

    public AdminUserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public List<AdminUserDto> listUsers(int limit) {
    if (limit <= 0) {
        limit = 100;
    }
    List<User> users;
    if (limit >= 100) {
        users = userRepository.findAll(Sort.by(Sort.Direction.ASC, "name"));
    } else {
        PageRequest page = PageRequest.of(0, Math.max(1, limit), Sort.by(Sort.Direction.ASC, "name"));
        users = userRepository.findAll(page).getContent();
    }
    return users.stream().map(this::toDto).toList();
    }

    private AdminUserDto toDto(User user) {
        if (user == null) {
            return null;
        }
        return new AdminUserDto(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole(),
                user.isVerified()
        );
    }

    public AdminUserDto updateUserRole(String userId, String role) {
        if (role == null || role.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Role is required");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        user.setRole(role.trim());
        userRepository.save(user);
        return toDto(user);
    }
}
