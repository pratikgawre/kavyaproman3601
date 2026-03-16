package com.team1.backend.repository;

import com.team1.backend.model.Issue;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface IssueRepository extends MongoRepository<Issue, String> {
    List<Issue> findByCreatorEmailIgnoreCase(String creatorEmail);

    Optional<Issue> findByIdAndCreatorEmailIgnoreCase(String id, String creatorEmail);
}
