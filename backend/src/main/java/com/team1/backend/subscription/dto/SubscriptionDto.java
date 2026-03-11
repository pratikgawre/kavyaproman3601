package com.team1.backend.subscription.dto;

import lombok.Data;

@Data
public class SubscriptionDto {
    private String id;
    private String organizationName;
    private String planName;
    private String billingCycle;
}
