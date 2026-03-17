package com.team1.backend.service;

import com.team1.backend.model.Organization;
import com.team1.backend.model.User;
import com.team1.backend.repository.OrganizationRepository;
import com.team1.backend.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class OrganizationService {

    private final OrganizationRepository repository;
    private final UserRepository userRepository;

    public OrganizationService(OrganizationRepository repository, UserRepository userRepository) {
        this.repository = repository;
        this.userRepository = userRepository;
    }

    public List<Organization> listMine(String userId) {
        User user = requireUser(userId);
        return repository.findByOwnerIdOrderByCreatedAtDesc(user.getId());
    }

    public Organization create(String userId, Organization payload) {
        User user = requireUser(userId);
        String name = safeTrim(payload.getName());
        if (name.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Organization name is required");
        }

        Organization org = new Organization();
        org.setName(name);
        org.setSlug(normalizeSlug(payload.getSlug(), name));
        org.setDescription(safeTrim(payload.getDescription()));
        org.setLogoUrl(payload.getLogoUrl());
        org.setOwnerId(user.getId());
        org.setOwnerEmail(user.getEmail());
        org.setRole("OWNER");
        org.setMembersCount(Math.max(0, payload.getMembersCount()));
        org.setProjectsCount(Math.max(0, payload.getProjectsCount()));
        org.setCreatedAt(LocalDateTime.now());
        org.setUpdatedAt(LocalDateTime.now());
        return repository.save(org);
    }

    public Organization update(String userId, String id, Organization payload) {
        User user = requireUser(userId);
        Organization existing = repository.findByIdAndOwnerId(id, user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Organization not found"));

        String name = safeTrim(payload.getName());
        if (!name.isBlank()) {
            existing.setName(name);
        }
        String slug = normalizeSlug(payload.getSlug(), existing.getName());
        if (!slug.isBlank()) {
            existing.setSlug(slug);
        }
        existing.setDescription(safeTrim(payload.getDescription()));
        existing.setLogoUrl(payload.getLogoUrl());
        existing.setUpdatedAt(LocalDateTime.now());
        return repository.save(existing);
    }

    public void delete(String userId, String id) {
        User user = requireUser(userId);
        Organization existing = repository.findByIdAndOwnerId(id, user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Organization not found"));
        repository.delete(existing);
    }

    private User requireUser(String userId) {
        if (userId == null || userId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing X-USER-ID");
        }
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid user"));
    }

    private String safeTrim(String value) {
        return value == null ? "" : value.trim();
    }

    private String normalizeSlug(String rawSlug, String fallbackName) {
        String base = safeTrim(rawSlug);
        if (base.isBlank()) {
            base = safeTrim(fallbackName);
        }
        String slug = base.toLowerCase()
                .replaceAll("\\s+", "-")
                .replaceAll("[^a-z0-9-]", "");
        if (slug.isBlank()) {
            slug = "new-organization";
        }
        return slug;
    }
}
