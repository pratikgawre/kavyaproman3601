package com.team1.backend.repository;

import com.team1.backend.model.Sprint;
import java.util.List;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SprintRepository extends MongoRepository<Sprint, String> {
    List<Sprint> findByProjectKeyIgnoreCase(String projectKey);
    Optional<Sprint> findFirstByProjectKeyIgnoreCaseAndStatus(String projectKey, String status);
}
