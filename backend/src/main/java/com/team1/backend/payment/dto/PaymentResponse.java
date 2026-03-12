package com.team1.backend.payment.dto;

import lombok.Data;

import java.time.Instant;

@Data
public class PaymentResponse {
    private String id;
    private String userId;
    private String name;
    private String email;
    private String planName;
    private String billingCycle;
    private String method;
    private Double amount;
    private String currency;
    private String status;
    private Instant createdAt;
    private String referenceId;
}
