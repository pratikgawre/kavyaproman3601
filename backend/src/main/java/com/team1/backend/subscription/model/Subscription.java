package com.team1.backend.subscription.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document(collection = "subscriptions")
public class Subscription {
    @Id
    private String id;
    private String organizationName;
    private String planName;
    private String billingCycle; // monthly or yearly
}
