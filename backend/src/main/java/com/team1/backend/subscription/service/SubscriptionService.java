package com.team1.backend.subscription.service;

import com.team1.backend.subscription.dto.InvoiceDto;
import com.team1.backend.subscription.dto.PlanDto;
import com.team1.backend.subscription.dto.SubscriptionDto;
import com.team1.backend.subscription.model.Invoice;
import com.team1.backend.subscription.model.Plan;
import com.team1.backend.subscription.model.Subscription;
import com.team1.backend.subscription.repository.InvoiceRepository;
import com.team1.backend.subscription.repository.PlanRepository;
import com.team1.backend.subscription.repository.SubscriptionRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class SubscriptionService {

    private final PlanRepository planRepository;
    private final InvoiceRepository invoiceRepository;
    private final SubscriptionRepository subscriptionRepository;

    public SubscriptionService(PlanRepository planRepository, InvoiceRepository invoiceRepository, SubscriptionRepository subscriptionRepository) {
        this.planRepository = planRepository;
        this.invoiceRepository = invoiceRepository;
        this.subscriptionRepository = subscriptionRepository;
    }

    public List<PlanDto> getPlans() {
        return planRepository.findAll().stream().map(this::toPlanDto).collect(Collectors.toList());
    }

    public List<InvoiceDto> getInvoices() {
        return invoiceRepository.findAll().stream().map(this::toInvoiceDto).collect(Collectors.toList());
    }

    public SubscriptionDto getCurrentSubscription() {
        // Return the first subscription (demo). In a real app, filter by organization/user
        return subscriptionRepository.findAll().stream().findFirst().map(this::toSubscriptionDto).orElse(null);
    }

    private PlanDto toPlanDto(Plan p) {
        PlanDto dto = new PlanDto();
        dto.setId(p.getId());
        dto.setName(p.getName());
        dto.setDescription(p.getDescription());
        dto.setMonthlyPrice(p.getMonthlyPrice());
        dto.setYearlyPrice(p.getYearlyPrice());
        dto.setFeatured(p.isFeatured());
        return dto;
    }

    private InvoiceDto toInvoiceDto(Invoice i) {
        InvoiceDto dto = new InvoiceDto();
        dto.setId(i.getId());
        dto.setInvoiceNumber(i.getInvoiceNumber());
        dto.setDate(i.getDate());
        dto.setAmount(i.getAmount());
        dto.setStatus(i.getStatus());
        return dto;
    }

    private SubscriptionDto toSubscriptionDto(Subscription s) {
        SubscriptionDto dto = new SubscriptionDto();
        dto.setId(s.getId());
        dto.setOrganizationName(s.getOrganizationName());
        dto.setPlanName(s.getPlanName());
        dto.setBillingCycle(s.getBillingCycle());
        return dto;
    }
}
