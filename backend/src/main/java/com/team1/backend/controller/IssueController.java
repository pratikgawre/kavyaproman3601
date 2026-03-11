package com.team1.backend.controller;

import com.team1.backend.model.Issue;
import com.team1.backend.service.IssueService;
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
    public List<Issue> list(){ return service.listAll(); }

    @GetMapping("/{id}")
    public ResponseEntity<Issue> get(@PathVariable String id){
        return service.findById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Issue> create(@RequestBody Issue issue){
        Issue saved = service.create(issue);
        return ResponseEntity.created(URI.create("/api/issues/"+saved.getId())).body(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Issue> update(@PathVariable String id, @RequestBody Issue issue){
        Issue saved = service.update(id, issue);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id){
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
