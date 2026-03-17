package com.team1.backend.subscription.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Document(collection = "subscription-member")
public class SubscriptionMember {
    @Id
    private String id;
    private String userId;
    private String organizationName;
    private String planName;
    private String billingCycle;
    private String status;
    private String method;
    private Double amount;
    private String currency;
    private String paymentReference;
    private String paymentId;
    private String name;
    private String email;
    private Instant purchasedAt;
}
