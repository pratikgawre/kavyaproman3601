package com.team1.backend.repository;

import com.team1.backend.model.Project;
import java.util.List;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface ProjectRepository extends MongoRepository<Project, String> {
    List<Project> findByManagerEmail(String managerEmail);
    List<Project> findByTeamMembersEmail(String email);
    Optional<Project> findByProjectKeyAndManagerEmail(String projectKey, String managerEmail);
    Optional<Project> findByProjectKeyIgnoreCase(String projectKey);
    long countByOrganizationId(String organizationId);
    List<Project> findByOrganizationId(String organizationId);
    long countByOrganizationUsernameAndOrganizationIdIsNull(String organizationUsername);
    List<Project> findByOrganizationUsername(String organizationUsername);
    List<Project> findByOrganizationNameIgnoreCase(String organizationName);
    long countByManagerEmail(String managerEmail);
    long countByManagerEmailIgnoreCase(String managerEmail);
    List<Project> findByManagerEmailIgnoreCase(String managerEmail);
}
