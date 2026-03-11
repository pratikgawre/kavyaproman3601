package com.team1.backend.subscription.repository;

import com.team1.backend.subscription.model.Invoice;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface InvoiceRepository extends MongoRepository<Invoice, String> {
}
