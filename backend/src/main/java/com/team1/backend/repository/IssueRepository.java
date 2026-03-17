package com.team1.backend.repository;

import com.team1.backend.model.Issue;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface IssueRepository extends MongoRepository<Issue, String> {
    List<Issue> findByProject(String project);
}
