package com.team1.backend.controller;

import com.team1.backend.model.Organization;
import com.team1.backend.service.OrganizationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/organizations")
public class OrganizationController {

    private final OrganizationService service;

    public OrganizationController(OrganizationService service) {
        this.service = service;
    }

    @GetMapping
    public List<Organization> list(@RequestHeader("X-USER-ID") String userId) {
        return service.listMine(userId);
    }

    @PostMapping
    public ResponseEntity<Organization> create(
            @RequestHeader("X-USER-ID") String userId,
            @RequestBody Organization payload) {
        Organization saved = service.create(userId, payload);
        return ResponseEntity.created(URI.create("/api/organizations/" + saved.getId())).body(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Organization> update(
            @RequestHeader("X-USER-ID") String userId,
            @PathVariable String id,
            @RequestBody Organization payload) {
        Organization saved = service.update(userId, id, payload);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @RequestHeader("X-USER-ID") String userId,
            @PathVariable String id) {
        service.delete(userId, id);
        return ResponseEntity.noContent().build();
    }
}
