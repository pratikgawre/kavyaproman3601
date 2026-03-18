package com.team1.backend.controller;

import com.team1.backend.model.Member;
import com.team1.backend.service.MemberService;
import org.springframework.http.HttpStatus;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/members")
public class MemberController {

    private final MemberService memberService;

    public MemberController(MemberService memberService) {
        this.memberService = memberService;
    }

    // Get all members
    @GetMapping
    public ResponseEntity<List<Member>> getAllMembers(
            @RequestParam(required = false) String managerEmail,
            @RequestParam(required = false) String memberEmail,
            @RequestParam(required = false) String organizationId,
            @RequestParam(required = false) String organizationUsername,
            @RequestParam(required = false) String organizationName
    ) {
        List<Member> members = memberService.getMembers(
                managerEmail,
                memberEmail,
                organizationId,
                organizationUsername,
                organizationName
        );
        return ResponseEntity.ok(members);
    }

    // Get member by ID
    @GetMapping("/{id}")
    public ResponseEntity<Member> getMemberById(@PathVariable String id) {
        try {
            Member member = memberService.getMemberById(id);
            return ResponseEntity.ok(member);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // Create new member
    @PostMapping
    public ResponseEntity<?> createMember(@RequestBody Member member) {
        try {
            Member createdMember = memberService.addMember(member);
            return ResponseEntity.status(HttpStatus.CREATED).body(createdMember);
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
        } catch (DataIntegrityViolationException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("Member already exists in this team.");
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage() == null ? "Failed to invite member" : e.getMessage());
        }
    }

    // Update member
    @PutMapping("/{id}")
    public ResponseEntity<Member> updateMember(
            @PathVariable String id,
            @RequestBody Member member) {
        try {
            Member updatedMember = memberService.updateMember(id, member);
            return ResponseEntity.ok(updatedMember);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // Delete member
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMember(@PathVariable String id) {
        try {
            memberService.deleteMember(id);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
