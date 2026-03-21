package com.team1.backend.repository;

import com.team1.backend.model.Issue;
import java.util.List;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface IssueRepository extends MongoRepository<Issue, String> {
    List<Issue> findByProject(String project);
    Optional<Issue> findByIdAndCreatorEmailIgnoreCase(String id, String creatorEmail);
    List<Issue> findBySprintId(String sprintId);
    List<Issue> findBySprintIdIn(List<String> sprintIds);
}
