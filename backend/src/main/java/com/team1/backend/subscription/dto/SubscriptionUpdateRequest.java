package com.team1.backend.subscription.dto;

import lombok.Data;

import java.time.Instant;

@Data
public class SubscriptionUpdateRequest {
    private String planName;
    private String billingCycle;
    private String method;
    private Double amount;
    private String currency;
    private String status;
    private String paymentReference;
    private String paymentId;
    private String organizationName;
    private String name;
    private String email;
    private Instant purchasedAt;
}
