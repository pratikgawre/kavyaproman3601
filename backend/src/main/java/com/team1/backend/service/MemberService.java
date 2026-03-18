package com.team1.backend.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

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
        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Member not found with id: " + id));
        applyUserAvatar(member);
        return member;
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
        if ((member.getImage() == null || member.getImage().trim().isEmpty()) && member.getEmail() != null) {
            userRepository.findByEmailIgnoreCase(member.getEmail()).ifPresent(user -> {
                String avatar = user.getAvatar();
                if (avatar != null && !avatar.trim().isEmpty()) {
                    member.setImage(avatar.trim());
                }
            });
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
        return memberRepository.save(member);
    }

    public Member updateMember(String id, Member updatedMember) {
        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Member not found with id: " + id));

        if (updatedMember.getName() != null) {
            member.setName(updatedMember.getName());
        }
        if (updatedMember.getEmail() != null) {
            member.setEmail(updatedMember.getEmail());
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

        return memberRepository.save(member);
    }

    public void deleteMember(String id) {
        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Member not found with id: " + id));
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

    private void applyUserAvatar(Member member) {
        if (member == null || member.getEmail() == null) {
            return;
        }
        String email = member.getEmail().trim().toLowerCase();
        if (email.isEmpty()) {
            return;
        }
        userRepository.findByEmailIgnoreCase(email).ifPresent(user -> {
            String avatar = user.getAvatar();
            if (avatar != null && !avatar.trim().isEmpty()) {
                member.setImage(avatar.trim());
            }
        });
    }
}
