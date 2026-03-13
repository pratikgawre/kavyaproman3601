package com.team1.backend.subscription.repository;

import com.team1.backend.subscription.model.Plan;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface PlanRepository extends MongoRepository<Plan, String> {
    Optional<Plan> findByName(String name);
}
