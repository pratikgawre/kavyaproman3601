package com.team1.backend.service;

import java.time.LocalDateTime;
import java.util.List;
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
        List<Member> members = memberRepository.findAll();
        members.forEach(this::applyUserAvatar);
        return members;
    }

    public Member getMemberById(String id) {
        return memberRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Member not found"));
    }

    public Member addMember(Member member) {
        String nextEmail = normalizeEmail(member.getEmail());
        if (nextEmail == null || nextEmail.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is required");
        }
        member.setEmail(nextEmail);

        if (memberRepository.existsByEmail(nextEmail)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already in use");
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

    private String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase();
    }
}
