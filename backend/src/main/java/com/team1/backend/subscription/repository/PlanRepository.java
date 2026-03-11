package com.team1.backend.subscription.repository;

import com.team1.backend.subscription.model.Plan;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface PlanRepository extends MongoRepository<Plan, String> {
}
