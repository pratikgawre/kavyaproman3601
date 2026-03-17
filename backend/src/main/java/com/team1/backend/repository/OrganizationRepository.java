package com.team1.backend.repository;

import com.team1.backend.model.Organization;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OrganizationRepository extends MongoRepository<Organization, String> {
    List<Organization> findByOwnerIdOrderByCreatedAtDesc(String ownerId);

    Optional<Organization> findByIdAndOwnerId(String id, String ownerId);
}
