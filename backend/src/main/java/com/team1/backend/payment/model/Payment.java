package com.team1.backend.payment.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Document(collection = "payments")
public class Payment {
    @Id
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
    private String upiId;
    private String cardLast4;
}
