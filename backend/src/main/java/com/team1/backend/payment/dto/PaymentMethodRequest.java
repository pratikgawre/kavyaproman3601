package com.team1.backend.payment.dto;

import lombok.Data;

@Data
public class PaymentMethodRequest {
    private String userId;
    private String type; // card or upi
    private String upiId;
    private String cardLast4;
    private String cardHolderName;
}
