package com.team1.backend.service;

import com.team1.backend.model.Issue;
import com.team1.backend.repository.IssueRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class IssueService {

    private final IssueRepository repo;

    public IssueService(IssueRepository repo){ this.repo = repo; }

    public List<Issue> listAll(){ return repo.findAll(); }

    public Optional<Issue> findById(String id){ return repo.findById(id); }

    public Issue create(Issue issue){
        issue.setCreatedAt(LocalDateTime.now());
        issue.setUpdatedAt(LocalDateTime.now());
        return repo.save(issue);
    }

    public Issue update(String id, Issue updated){
        return repo.findById(id).map(existing -> {
            existing.setCreatorName(updated.getCreatorName());
            existing.setCreatorEmail(updated.getCreatorEmail());
            existing.setProject(updated.getProject());
            existing.setIssueType(updated.getIssueType());
            existing.setEpicName(updated.getEpicName());
            existing.setSummary(updated.getSummary());
            existing.setDescription(updated.getDescription());
            existing.setAttachmentsJson(updated.getAttachmentsJson());
            existing.setDifficulty(updated.getDifficulty());
            existing.setUpdatedAt(LocalDateTime.now());
            return repo.save(existing);
        }).orElseGet(() -> {
            updated.setId(id);
            updated.setCreatedAt(LocalDateTime.now());
            updated.setUpdatedAt(LocalDateTime.now());
            return repo.save(updated);
        });
    }

    public void delete(String id){ repo.deleteById(id); }
}
