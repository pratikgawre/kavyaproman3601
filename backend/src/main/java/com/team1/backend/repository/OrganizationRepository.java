package com.team1.backend.repository;

import com.team1.backend.model.Organization;
import java.util.List;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface OrganizationRepository extends MongoRepository<Organization, String> {
    Optional<Organization> findByUsername(String username);
    List<Organization> findByOwnerEmail(String ownerEmail);
}
