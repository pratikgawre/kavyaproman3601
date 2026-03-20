package com.team1.backend.controller;

import com.team1.backend.model.Sprint;
import com.team1.backend.service.SprintService;
import java.net.URI;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/sprints")
public class SprintController {

    private final SprintService sprintService;

    public SprintController(SprintService sprintService) {
        this.sprintService = sprintService;
    }

    @GetMapping
    public List<Sprint> list(@RequestParam(required = false) String project) {
        return sprintService.list(project);
    }

    @PostMapping
    public ResponseEntity<Sprint> create(@RequestBody Sprint sprint) {
        Sprint saved = sprintService.create(sprint);
        return ResponseEntity.created(URI.create("/api/sprints/" + saved.getId())).body(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Sprint> update(@PathVariable String id, @RequestBody Sprint sprint) {
        Sprint saved = sprintService.update(id, sprint);
        return ResponseEntity.ok(saved);
    }

    @PostMapping("/{id}/start")
    public ResponseEntity<Sprint> start(@PathVariable String id) {
        Sprint saved = sprintService.startSprint(id);
        return ResponseEntity.ok(saved);
    }

    @PostMapping("/{id}/complete")
    public ResponseEntity<Sprint> complete(@PathVariable String id) {
        Sprint saved = sprintService.completeSprint(id);
        return ResponseEntity.ok(saved);
    }
}
