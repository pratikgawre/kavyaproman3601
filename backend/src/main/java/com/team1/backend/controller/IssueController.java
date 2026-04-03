package com.team1.backend.controller;

import com.team1.backend.dto.AddIssueCommentRequest;
import com.team1.backend.model.Issue;
import com.team1.backend.service.IssueService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/issues")
public class IssueController {

    private final IssueService service;

    public IssueController(IssueService service){ this.service = service; }

    @GetMapping
    public List<Issue> list(
            @RequestParam(required = false) String project,
            @RequestParam(defaultValue = "false") boolean includeArchived){
        return service.listAll(project, includeArchived);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Issue> get(
            @RequestHeader("X-USER-ID") String userId,
            @PathVariable String id){
        return service.findMineById(userId, id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Issue> create(
            @RequestHeader("X-USER-ID") String userId,
            @RequestBody Issue issue){
        Issue saved = service.create(userId, issue);
        return ResponseEntity.created(URI.create("/api/issues/"+saved.getId())).body(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Issue> update(
            @RequestHeader("X-USER-ID") String userId,
            @PathVariable String id,
            @RequestBody Issue issue){
        Issue saved = service.update(userId, id, issue);
        return ResponseEntity.ok(saved);
    }

    @PostMapping("/{id}/comments")
    public ResponseEntity<Issue> addComment(
            @RequestHeader("X-USER-ID") String userId,
            @PathVariable String id,
            @Valid @RequestBody AddIssueCommentRequest req) {
        Issue saved = service.addComment(userId, id, req.getMessage(), req.getAttachments());
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @RequestHeader("X-USER-ID") String userId,
            @PathVariable String id){
        service.delete(userId, id);
        return ResponseEntity.noContent().build();
    }
}
