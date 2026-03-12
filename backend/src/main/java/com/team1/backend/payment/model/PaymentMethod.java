package com.team1.backend.payment.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Document(collection = "payment_methods")
public class PaymentMethod {
    @Id
    private String id;
    private String userId;
    private String type; // card or upi
    private String upiId;
    private String cardLast4;
    private String cardHolderName;
    private Instant createdAt;
}
