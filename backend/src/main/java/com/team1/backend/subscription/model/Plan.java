package com.team1.backend.subscription.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document(collection = "plans")
public class Plan {
    @Id
    private String id;
    private String name;
    private String description;
    private double monthlyPrice;
    private double yearlyPrice;
    private boolean featured;
}
