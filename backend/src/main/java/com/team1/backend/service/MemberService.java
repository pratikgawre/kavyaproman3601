package com.team1.backend.service;

import java.time.LocalDateTime;
import java.util.List;

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
        List<Member> members = memberRepository.findAll();
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
        if (normalizedEmail != null && incomingManagerEmail != null) {
            var existingSameTeam = memberRepository.findByEmailAndManagerEmail(normalizedEmail, incomingManagerEmail);
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

        return memberRepository.save(member);
    }

    public void deleteMember(String id) {
        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Member not found with id: " + id));
        memberRepository.deleteById(id);
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
