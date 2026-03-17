package com.team1.backend.subscription.repository;

import com.team1.backend.subscription.model.SubscriptionMember;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface SubscriptionMemberRepository extends MongoRepository<SubscriptionMember, String> {
    Optional<SubscriptionMember> findTopByUserIdOrderByPurchasedAtDesc(String userId);
    Optional<SubscriptionMember> findTopByOrderByPurchasedAtDesc();
}
