package com.team1.backend.controller;

import com.team1.backend.model.Member;
import com.team1.backend.service.MemberService;
import org.springframework.http.HttpStatus;
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
    public ResponseEntity<List<Member>> getAllMembers() {
        List<Member> members = memberService.getAllMembers();
        return ResponseEntity.ok(members);
    }

    // Get member by ID
    @GetMapping("/{id}")
    public ResponseEntity<Member> getMemberById(@PathVariable String id) {
        Member member = memberService.getMemberById(id);
        return ResponseEntity.ok(member);
    }

    // Create new member
    @PostMapping
    public ResponseEntity<Member> createMember(@RequestBody Member member) {
        Member createdMember = memberService.addMember(member);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdMember);
    }

    // Update member
    @PutMapping("/{id}")
    public ResponseEntity<Member> updateMember(
            @PathVariable String id,
            @RequestBody Member member) {
        Member updatedMember = memberService.updateMember(id, member);
        return ResponseEntity.ok(updatedMember);
    }

    // Delete member
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMember(@PathVariable String id) {
        memberService.deleteMember(id);
        return ResponseEntity.noContent().build();
    }
}
