package com.team1.backend.payment.dto;

import lombok.Data;

@Data
public class PaymentRequest {
    private String userId;
    private String name;
    private String email;
    private String planName;
    private String billingCycle;
    private String method; // card or upi
    private Double amount;
    private String currency;
    private String upiId;
    private String cardLast4;
}
