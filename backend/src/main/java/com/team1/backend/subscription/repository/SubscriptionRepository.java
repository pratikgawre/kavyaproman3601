package com.team1.backend.subscription.repository;

import com.team1.backend.subscription.model.Subscription;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface SubscriptionRepository extends MongoRepository<Subscription, String> {
}
