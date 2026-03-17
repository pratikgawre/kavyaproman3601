package com.team1.backend.subscription.dto;

import lombok.Data;

import java.time.Instant;

@Data
public class SubscriptionDto {
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
    private Instant expiresAt;
    private boolean expired;
}
