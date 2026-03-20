package com.team1.backend.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.team1.backend.model.Member;
import com.team1.backend.repository.MemberRepository;
import com.team1.backend.repository.UserRepository;

@Service
public class MemberService {

    private final MemberRepository memberRepository;
    private final UserRepository userRepository;

    public MemberService(MemberRepository memberRepository, UserRepository userRepository) {
        this.memberRepository = memberRepository;
        this.userRepository = userRepository;
    }

    public List<Member> getAllMembers() {
        return getMembers(null, null, null, null, null);
    }

    public List<Member> getMembers(
            String managerEmail,
            String memberEmail,
            String organizationId,
            String organizationUsername,
            String organizationName
    ) {
        String normalizedManager = normalizeEmail(managerEmail);
        String normalizedMember = normalizeEmail(memberEmail);
        String normalizedOrgId = normalizeText(organizationId);
        String normalizedOrgUsername = normalizeOrgUsername(organizationUsername);
        String normalizedOrgName = normalizeText(organizationName);

        boolean hasOrgFilter = (normalizedOrgId != null && !normalizedOrgId.isEmpty())
                || (normalizedOrgUsername != null && !normalizedOrgUsername.isEmpty())
                || (normalizedOrgName != null && !normalizedOrgName.isEmpty());

        List<Member> members;
        if (hasOrgFilter) {
            members = collectMembers(normalizedOrgId, normalizedOrgUsername, normalizedOrgName);
            members = filterByAccess(members, normalizedManager, normalizedMember);
        } else if (normalizedManager != null && !normalizedManager.isEmpty()) {
            members = memberRepository.findByManagerEmail(normalizedManager);
        } else if (normalizedMember != null && !normalizedMember.isEmpty()) {
            members = memberRepository.findByEmailIgnoreCase(normalizedMember);
        } else {
            members = memberRepository.findAll();
        }

        members.forEach(this::applyUserAvatar);
        return members;
    }

    public Member getMemberById(String id) {
        return memberRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Member not found"));
    }

    public Member addMember(Member member) {
        String incomingManagerEmail = null;
        if (member.getManagerEmail() != null) {
            incomingManagerEmail = member.getManagerEmail().trim().toLowerCase();
            member.setManagerEmail(incomingManagerEmail);
        }
        String normalizedEmail = null;
        if (member.getEmail() != null) {
            normalizedEmail = member.getEmail().trim().toLowerCase();
            member.setEmail(normalizedEmail);
        }
        if (member.getOrganizationId() != null) {
            member.setOrganizationId(member.getOrganizationId().trim());
        }
        if (member.getOrganizationUsername() != null) {
            String normalizedOrgUsername = member.getOrganizationUsername().trim().toLowerCase();
            member.setOrganizationUsername(normalizedOrgUsername.isEmpty() ? null : normalizedOrgUsername);
        }
        if (member.getOrganizationName() != null) {
            String normalizedOrgName = member.getOrganizationName().trim();
            member.setOrganizationName(normalizedOrgName.isEmpty() ? null : normalizedOrgName);
        }
        if (normalizedEmail != null && incomingManagerEmail != null) {
            Member legacyMember = findAndAdoptLegacyMember(member, normalizedEmail, incomingManagerEmail);
            if (legacyMember != null) {
                return legacyMember;
            }

            String orgId = normalizeText(member.getOrganizationId());
            String orgUsername = normalizeOrgUsername(member.getOrganizationUsername());
            String orgName = normalizeText(member.getOrganizationName());

            var existingSameTeam = (orgId != null)
                    ? memberRepository.findByEmailAndManagerEmailAndOrganizationId(normalizedEmail, incomingManagerEmail, orgId)
                    : (orgUsername != null)
                    ? memberRepository.findByEmailAndManagerEmailAndOrganizationUsername(normalizedEmail, incomingManagerEmail, orgUsername)
                    : (orgName != null)
                    ? memberRepository.findByEmailAndManagerEmailAndOrganizationNameIgnoreCase(normalizedEmail, incomingManagerEmail, orgName)
                    : memberRepository.findByEmailAndManagerEmail(normalizedEmail, incomingManagerEmail);

            if (existingSameTeam.isPresent()) {
                Member existingMember = existingSameTeam.get();
                if (member.getRole() != null) {
                    existingMember.setRole(member.getRole());
                }
                if (member.getName() != null) {
                    existingMember.setName(member.getName());
                }
                if (member.getImage() != null && !member.getImage().trim().isEmpty()) {
                    existingMember.setImage(member.getImage().trim());
                }
                if (member.getOrganizationId() != null) {
                    existingMember.setOrganizationId(member.getOrganizationId());
                }
                if (member.getOrganizationUsername() != null) {
                    existingMember.setOrganizationUsername(member.getOrganizationUsername());
                }
                if (member.getOrganizationName() != null) {
                    existingMember.setOrganizationName(member.getOrganizationName());
                }
                applyUserAvatar(existingMember);
                return memberRepository.save(existingMember);
            }
        }
        member.setEmail(normalizedEmail);

        // Only enforce global email uniqueness when we don't have a manager scope.
        // When a manager is present, allow the same email to be invited by other managers/orgs.
        if (incomingManagerEmail == null || incomingManagerEmail.isBlank()) {
            if (memberRepository.existsByEmail(normalizedEmail)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already in use");
            }
        }

        if (member.getProjects() == null) {
            member.setProjects(0);
        }
        if (member.getActiveIssues() == null) {
            member.setActiveIssues(0);
        }
        if (member.getCreatedAt() == null) {
            member.setCreatedAt(LocalDateTime.now());
        }
        try {
            return memberRepository.save(member);
        } catch (DataIntegrityViolationException ex) {
            if (normalizedEmail != null && incomingManagerEmail != null) {
                Member legacyMember = findAndAdoptLegacyMember(member, normalizedEmail, incomingManagerEmail);
                if (legacyMember != null) {
                    return legacyMember;
                }
            }
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already in use");
        }
    }

    public Member updateMember(String id, Member updatedMember) {
        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Member not found"));

        if (updatedMember.getName() != null) {
            member.setName(updatedMember.getName());
        }
        if (updatedMember.getEmail() != null) {
            String nextEmail = normalizeEmail(updatedMember.getEmail());
            if (nextEmail == null || nextEmail.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is required");
            }
            if (!nextEmail.equalsIgnoreCase(member.getEmail())) {
                Optional<Member> existing = memberRepository.findByEmail(nextEmail);
                if (existing.isPresent() && existing.get().getId() != null && !existing.get().getId().equals(member.getId())) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already in use");
                }
            }
            member.setEmail(nextEmail);
        }
        if (updatedMember.getRole() != null) {
            member.setRole(updatedMember.getRole());
        }
        if (updatedMember.getProjects() != null) {
            member.setProjects(updatedMember.getProjects());
        }
        if (updatedMember.getActiveIssues() != null) {
            member.setActiveIssues(updatedMember.getActiveIssues());
        }
        if (updatedMember.getImage() != null) {
            member.setImage(updatedMember.getImage());
        }
        if (updatedMember.getManagerEmail() != null) {
            member.setManagerEmail(updatedMember.getManagerEmail());
        }
        if (updatedMember.getOrganizationId() != null) {
            member.setOrganizationId(updatedMember.getOrganizationId().trim());
        }
        if (updatedMember.getOrganizationUsername() != null) {
            String normalizedOrgUsername = updatedMember.getOrganizationUsername().trim().toLowerCase();
            member.setOrganizationUsername(normalizedOrgUsername.isEmpty() ? null : normalizedOrgUsername);
        }
        if (updatedMember.getOrganizationName() != null) {
            String normalizedOrgName = updatedMember.getOrganizationName().trim();
            member.setOrganizationName(normalizedOrgName.isEmpty() ? null : normalizedOrgName);
        }

        try {
            return memberRepository.save(member);
        } catch (DataIntegrityViolationException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already in use");
        }
    }

    public void deleteMember(String id) {
        memberRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Member not found"));
        memberRepository.deleteById(id);
    }

    private List<Member> collectMembers(String organizationId, String organizationUsername, String organizationName) {
        Map<String, Member> uniqueMembers = new LinkedHashMap<>();
        if (organizationId != null && !organizationId.isEmpty()) {
            addMembers(uniqueMembers, memberRepository.findByOrganizationId(organizationId));
        }
        if (organizationUsername != null && !organizationUsername.isEmpty()) {
            addMembers(uniqueMembers, memberRepository.findByOrganizationUsername(organizationUsername));
        }
        if (organizationName != null && !organizationName.isEmpty()) {
            addMembers(uniqueMembers, memberRepository.findByOrganizationNameIgnoreCase(organizationName));
        }
        return new ArrayList<>(uniqueMembers.values());
    }

    private void addMembers(Map<String, Member> target, List<Member> members) {
        if (members == null) return;
        for (Member member : members) {
            if (member == null) continue;
            String key = member.getId() != null ? member.getId() : normalizeEmail(member.getEmail());
            if (key == null || key.isEmpty()) continue;
            target.put(key, member);
        }
    }

    private List<Member> filterByAccess(List<Member> members, String managerEmail, String memberEmail) {
        if (members == null) {
            return new ArrayList<>();
        }
        if (managerEmail != null && !managerEmail.isEmpty()) {
            List<Member> filtered = new ArrayList<>();
            for (Member member : members) {
                if (member == null) continue;
                String candidate = normalizeEmail(member.getManagerEmail());
                if (managerEmail.equals(candidate)) {
                    filtered.add(member);
                }
            }
            return filtered;
        }
        if (memberEmail != null && !memberEmail.isEmpty()) {
            List<Member> filtered = new ArrayList<>();
            for (Member member : members) {
                if (member == null) continue;
                String candidate = normalizeEmail(member.getEmail());
                if (memberEmail.equals(candidate)) {
                    filtered.add(member);
                }
            }
            return filtered;
        }
        return members;
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

    private String normalizeOrgUsername(String username) {
        if (username == null) return null;
        String trimmed = username.trim().toLowerCase();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private Member findAndAdoptLegacyMember(Member incoming, String normalizedEmail, String incomingManagerEmail) {
        List<Member> matches = memberRepository.findByEmailIgnoreCase(normalizedEmail);
        if (matches == null || matches.isEmpty()) {
            return null;
        }

        String incomingOrgKey = resolveOrgKey(
                normalizeText(incoming.getOrganizationId()),
                normalizeOrgUsername(incoming.getOrganizationUsername()),
                normalizeText(incoming.getOrganizationName())
        );

        for (Member existing : matches) {
            if (existing == null) continue;
            String existingManager = normalizeEmail(existing.getManagerEmail());
            if (existingManager != null && !existingManager.isEmpty() && !existingManager.equals(incomingManagerEmail)) {
                continue;
            }

            String existingOrgKey = resolveOrgKey(
                    normalizeText(existing.getOrganizationId()),
                    normalizeOrgUsername(existing.getOrganizationUsername()),
                    normalizeText(existing.getOrganizationName())
            );
            boolean orgCompatible = incomingOrgKey == null || existingOrgKey == null || incomingOrgKey.equals(existingOrgKey);
            if (!orgCompatible) {
                continue;
            }

            if (incoming.getName() != null) {
                existing.setName(incoming.getName());
            }
            if (incoming.getRole() != null) {
                existing.setRole(incoming.getRole());
            }
            if (incoming.getImage() != null && !incoming.getImage().trim().isEmpty()) {
                existing.setImage(incoming.getImage().trim());
            }
            existing.setEmail(normalizedEmail);
            existing.setManagerEmail(incomingManagerEmail);
            if (incoming.getOrganizationId() != null) {
                existing.setOrganizationId(incoming.getOrganizationId().trim());
            }
            if (incoming.getOrganizationUsername() != null) {
                String normalizedOrgUsername = incoming.getOrganizationUsername().trim().toLowerCase();
                existing.setOrganizationUsername(normalizedOrgUsername.isEmpty() ? null : normalizedOrgUsername);
            }
            if (incoming.getOrganizationName() != null) {
                String normalizedOrgName = incoming.getOrganizationName().trim();
                existing.setOrganizationName(normalizedOrgName.isEmpty() ? null : normalizedOrgName);
            }
            if (existing.getProjects() == null) {
                existing.setProjects(0);
            }
            if (existing.getActiveIssues() == null) {
                existing.setActiveIssues(0);
            }
            if (existing.getCreatedAt() == null) {
                existing.setCreatedAt(LocalDateTime.now());
            }
            applyUserAvatar(existing);
            return memberRepository.save(existing);
        }
        return null;
    }

    private String resolveOrgKey(String organizationId, String organizationUsername, String organizationName) {
        if (organizationId != null && !organizationId.isEmpty()) {
            return "id:" + organizationId;
        }
        if (organizationUsername != null && !organizationUsername.isEmpty()) {
            return "username:" + organizationUsername.toLowerCase();
        }
        if (organizationName != null && !organizationName.isEmpty()) {
            return "name:" + organizationName.toLowerCase();
        }
        return null;
    }

    private void applyUserAvatar(Member member) {
        if (member == null) {
            return;
        }
        if (member.getImage() != null && !member.getImage().isBlank()) {
            return;
        }
        String email = normalizeEmail(member.getEmail());
        if (email == null || email.isBlank()) {
            return;
        }
        userRepository.findByEmailIgnoreCase(email)
                .map(user -> user.getAvatar())
                .filter(avatar -> avatar != null && !avatar.isBlank())
                .ifPresent(member::setImage);
    }
}
