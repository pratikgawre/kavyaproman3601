package com.team1.backend.payment.repository;

import com.team1.backend.payment.model.Payment;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends MongoRepository<Payment, String> {
    List<Payment> findByUserIdOrderByCreatedAtDesc(String userId);
    Optional<Payment> findByReferenceId(String referenceId);
}
