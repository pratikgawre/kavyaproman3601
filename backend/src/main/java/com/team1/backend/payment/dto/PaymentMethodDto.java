package com.team1.backend.payment.dto;

import lombok.Data;

import java.time.Instant;

@Data
public class PaymentMethodDto {
    private String id;
    private String userId;
    private String type;
    private String upiId;
    private String cardLast4;
    private String cardHolderName;
    private Instant createdAt;
}
