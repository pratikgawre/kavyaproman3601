package com.team1.backend.controller;

import com.team1.backend.model.Project;
import com.team1.backend.service.ProjectService;
import java.util.List;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {

    private final ProjectService projectService;

    public ProjectController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @GetMapping
    public ResponseEntity<List<Project>> getProjects(
            @RequestParam(required = false) String managerEmail,
            @RequestParam(required = false) String memberEmail
    ) {
        return ResponseEntity.ok(projectService.getProjects(managerEmail, memberEmail));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Project> getProjectById(@PathVariable String id) {
        try {
            return ResponseEntity.ok(projectService.getProjectById(id));
        } catch (RuntimeException ex) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping
    public ResponseEntity<?> createProject(@RequestBody Project project) {
        try {
            Project created = projectService.createProject(project);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        } catch (DataIntegrityViolationException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("Project key already exists.");
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Failed to create project");
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateProject(@PathVariable String id, @RequestBody Project project) {
        try {
            Project updated = projectService.updateProject(id, project);
            return ResponseEntity.ok(updated);
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Failed to update project");
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteProject(@PathVariable String id) {
        try {
            projectService.deleteProject(id);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Failed to delete project");
        }
    }
}
