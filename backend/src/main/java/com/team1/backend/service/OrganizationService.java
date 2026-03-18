package com.team1.backend.service;

import com.team1.backend.model.Organization;
import com.team1.backend.repository.MemberRepository;
import com.team1.backend.repository.OrganizationRepository;
import com.team1.backend.repository.ProjectRepository;
import java.time.LocalDateTime;
import com.team1.backend.model.Project;
import com.team1.backend.model.ProjectMember;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.Optional;
import org.springframework.stereotype.Service;

@Service
public class OrganizationService {

    private final OrganizationRepository organizationRepository;
    private final ProjectRepository projectRepository;
    private final MemberRepository memberRepository;

    public OrganizationService(
            OrganizationRepository organizationRepository,
            ProjectRepository projectRepository,
            MemberRepository memberRepository
    ) {
        this.organizationRepository = organizationRepository;
        this.projectRepository = projectRepository;
        this.memberRepository = memberRepository;
    }

    public List<Organization> getOrganizations(String ownerEmail) {
        String normalizedOwner = normalizeEmail(ownerEmail);
        List<Organization> organizations;
        if (normalizedOwner != null && !normalizedOwner.isEmpty()) {
            organizations = organizationRepository.findByOwnerEmail(normalizedOwner);
        } else {
            organizations = organizationRepository.findAll();
        }

        organizations.forEach(this::applyCounts);
        return organizations;
    }

    public Organization getOrganizationById(String id) {
        Organization organization = organizationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Organization not found"));
        applyCounts(organization);
        return organization;
    }

    public Organization createOrganization(Organization organization) {
        if (organization == null) {
            throw new IllegalArgumentException("Organization payload is required");
        }

        String normalizedName = normalizeText(organization.getName());
        if (normalizedName == null || normalizedName.isEmpty()) {
            throw new IllegalArgumentException("Organization name is required");
        }

        String normalizedUsername = normalizeSlug(organization.getUsername());
        if (normalizedUsername == null || normalizedUsername.isEmpty()) {
            normalizedUsername = normalizeSlug(normalizedName);
        }
        if (normalizedUsername == null || normalizedUsername.isEmpty()) {
            throw new IllegalArgumentException("Organization slug is required");
        }

        Optional<Organization> existing = organizationRepository.findByUsername(normalizedUsername);
        if (existing.isPresent()) {
            throw new IllegalStateException("Organization slug already exists.");
        }

        organization.setName(normalizedName);
        organization.setUsername(normalizedUsername);
        organization.setDescription(normalizeText(organization.getDescription()));
        organization.setOwnerEmail(normalizeEmail(organization.getOwnerEmail()));

        if (organization.getMembers() == null) {
            organization.setMembers(0);
        }
        if (organization.getProjects() == null) {
            organization.setProjects(0);
        }

        String role = normalizeText(organization.getRole());
        organization.setRole(role == null ? "OWNER" : role.toUpperCase());

        if (organization.getLogoUrl() != null && organization.getLogoUrl().trim().isEmpty()) {
            organization.setLogoUrl(null);
        }

        LocalDateTime now = LocalDateTime.now();
        organization.setCreatedAt(now);
        organization.setUpdatedAt(now);

        return organizationRepository.save(organization);
    }

    public Organization updateOrganization(String id, Organization updated) {
        Organization existing = organizationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Organization not found"));

        String nextName = normalizeText(updated.getName());
        if (nextName != null && !nextName.isEmpty()) {
            existing.setName(nextName);
        }

        String nextUsername = normalizeSlug(updated.getUsername());
        if (nextUsername != null && !nextUsername.isEmpty()
                && (existing.getUsername() == null || !nextUsername.equals(existing.getUsername()))) {
            Optional<Organization> conflict = organizationRepository.findByUsername(nextUsername);
            if (conflict.isPresent() && !conflict.get().getId().equals(existing.getId())) {
                throw new IllegalStateException("Organization slug already exists.");
            }
            existing.setUsername(nextUsername);
        }

        if (updated.getDescription() != null) {
            existing.setDescription(normalizeText(updated.getDescription()));
        }

        if (updated.getMembers() != null) {
            existing.setMembers(updated.getMembers());
        }

        if (updated.getProjects() != null) {
            existing.setProjects(updated.getProjects());
        }

        String nextRole = normalizeText(updated.getRole());
        if (nextRole != null && !nextRole.isEmpty()) {
            existing.setRole(nextRole.toUpperCase());
        }

        if (updated.getLogoUrl() != null) {
            String logo = updated.getLogoUrl().trim();
            existing.setLogoUrl(logo.isEmpty() ? null : logo);
        }

        if (updated.getOwnerEmail() != null) {
            existing.setOwnerEmail(normalizeEmail(updated.getOwnerEmail()));
        }

        existing.setUpdatedAt(LocalDateTime.now());
        return organizationRepository.save(existing);
    }

    public void deleteOrganization(String id) {
        organizationRepository.deleteById(id);
    }

    private String normalizeText(String text) {
        if (text == null) return null;
        String trimmed = text.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String normalizeEmail(String email) {
        if (email == null) return null;
        String trimmed = email.trim().toLowerCase();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String normalizeSlug(String value) {
        if (value == null) return null;
        String normalized = value.trim().toLowerCase();
        if (normalized.isEmpty()) return null;
        normalized = normalized.replaceAll("\\s+", "-");
        normalized = normalized.replaceAll("[^a-z0-9-]", "");
        normalized = normalized.replaceAll("-{2,}", "-");
        normalized = normalized.replaceAll("(^-+)|(-+$)", "");
        return normalized.isEmpty() ? null : normalized;
    }

    private void applyCounts(Organization organization) {
        if (organization == null) return;
        String orgId = organization.getId();
        if (orgId == null || orgId.trim().isEmpty()) {
            return;
        }
        String orgUsername = normalizeSlug(organization.getUsername());
        String orgName = normalizeText(organization.getName());
        List<Project> projects = collectProjects(orgId, orgUsername, orgName);
        organization.setProjects(projects.size());

        long memberCount = memberRepository.countByOrganizationId(orgId);
        if (memberCount == 0 && orgUsername != null) {
            memberCount = memberRepository.countByOrganizationUsernameAndOrganizationIdIsNull(orgUsername);
        }
        if (memberCount == 0 && orgName != null) {
            memberCount = memberRepository.countByOrganizationNameIgnoreCase(orgName);
        }
        long memberCountFromProjects = countMembersFromProjects(projects);
        if (memberCount < memberCountFromProjects) {
            memberCount = memberCountFromProjects;
        }
        organization.setMembers((int) memberCount);
    }

    private List<Project> collectProjects(String organizationId, String orgUsername, String orgName) {
        Map<String, Project> uniqueProjects = new LinkedHashMap<>();
        addProjects(uniqueProjects, projectRepository.findByOrganizationId(organizationId));
        if (orgUsername != null) {
            addProjects(uniqueProjects, projectRepository.findByOrganizationUsername(orgUsername));
        }
        if (orgName != null) {
            addProjects(uniqueProjects, projectRepository.findByOrganizationNameIgnoreCase(orgName));
        }
        return new ArrayList<>(uniqueProjects.values());
    }

    private void addProjects(Map<String, Project> target, List<Project> projects) {
        if (projects == null) return;
        for (Project project : projects) {
            if (project == null) continue;
            String key = project.getId() != null ? project.getId() : project.getProjectKey();
            if (key == null) continue;
            target.put(key, project);
        }
    }

    private long countMembersFromProjects(List<Project> projects) {
        if (projects == null || projects.isEmpty()) {
            return 0;
        }
        Set<String> uniqueMembers = new LinkedHashSet<>();
        for (Project project : projects) {
            List<ProjectMember> members = project.getTeamMembers();
            if (members == null) continue;
            for (ProjectMember member : members) {
                if (member == null) continue;
                String email = member.getEmail();
                if (email != null) {
                    String normalized = email.trim().toLowerCase();
                    if (!normalized.isEmpty()) {
                        uniqueMembers.add(normalized);
                        continue;
                    }
                }
                String name = member.getName();
                if (name != null) {
                    String normalized = name.trim().toLowerCase();
                    if (!normalized.isEmpty()) {
                        uniqueMembers.add(normalized);
                    }
                }
            }
        }
        return uniqueMembers.size();
    }
}
