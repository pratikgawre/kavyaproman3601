package com.team1.backend.repository;

import com.team1.backend.model.Project;
import java.util.List;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface ProjectRepository extends MongoRepository<Project, String> {
    List<Project> findByManagerEmail(String managerEmail);
    List<Project> findByTeamMembersEmail(String email);
    Optional<Project> findByProjectKeyAndManagerEmail(String projectKey, String managerEmail);
}
