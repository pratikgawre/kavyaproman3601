package com.team1.backend.payment.repository;

import com.team1.backend.payment.model.PaymentMethod;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface PaymentMethodRepository extends MongoRepository<PaymentMethod, String> {
    List<PaymentMethod> findByUserId(String userId);
}
