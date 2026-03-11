package com.team1.backend.subscription.dto;

import lombok.Data;
import java.time.LocalDate;

@Data
public class InvoiceDto {
    private String id;
    private String invoiceNumber;
    private LocalDate date;
    private double amount;
    private String status;
}
