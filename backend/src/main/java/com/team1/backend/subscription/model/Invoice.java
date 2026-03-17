package com.team1.backend.subscription.model;

import lombok.Data;
import java.time.LocalDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document(collection = "invoices")
public class Invoice {
    @Id
    private String id;
    private String invoiceNumber;
    private LocalDate date;
    private double amount;
    private String status; // Paid, Pending, Failed
}
