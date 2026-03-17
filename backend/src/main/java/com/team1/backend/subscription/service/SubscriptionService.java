package com.team1.backend.subscription.service;

import com.team1.backend.payment.model.Payment;
import com.team1.backend.subscription.dto.InvoiceDto;
import com.team1.backend.subscription.dto.PlanDto;
import com.team1.backend.subscription.dto.SubscriptionDto;
import com.team1.backend.subscription.dto.SubscriptionUpdateRequest;
import com.team1.backend.subscription.model.Invoice;
import com.team1.backend.subscription.model.Plan;
import com.team1.backend.subscription.model.SubscriptionMember;
import com.team1.backend.subscription.repository.InvoiceRepository;
import com.team1.backend.subscription.repository.PlanRepository;
import com.team1.backend.subscription.repository.SubscriptionMemberRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class SubscriptionService {

    private final PlanRepository planRepository;
    private final InvoiceRepository invoiceRepository;
    private final SubscriptionMemberRepository subscriptionMemberRepository;

    public SubscriptionService(PlanRepository planRepository,
                               InvoiceRepository invoiceRepository,
                               SubscriptionMemberRepository subscriptionMemberRepository) {
        this.planRepository = planRepository;
        this.invoiceRepository = invoiceRepository;
        this.subscriptionMemberRepository = subscriptionMemberRepository;
    }

    public List<PlanDto> getPlans() {
        return planRepository.findAll().stream().map(this::toPlanDto).collect(Collectors.toList());
    }

    public List<InvoiceDto> getInvoices() {
        return invoiceRepository.findAll().stream().map(this::toInvoiceDto).collect(Collectors.toList());
    }

    public SubscriptionDto getCurrentSubscription(String userId) {
        Optional<SubscriptionMember> member = Optional.empty();
        if (userId != null && !userId.isBlank()) {
            member = subscriptionMemberRepository.findTopByUserIdOrderByPurchasedAtDesc(userId);
        }
        if (member.isEmpty()) {
            member = subscriptionMemberRepository.findTopByOrderByPurchasedAtDesc();
        }
        if (member.isPresent() && isExpired(member.get())) {
            return defaultSubscriptionDto();
        }
        return member.map(this::toSubscriptionDto).orElseGet(this::defaultSubscriptionDto);
    }

    public SubscriptionDto updateCurrentSubscription(SubscriptionUpdateRequest request, String userId) {
        SubscriptionMember member = new SubscriptionMember();
        member.setUserId((userId != null && !userId.isBlank()) ? userId : null);
        member.setOrganizationName(request.getOrganizationName());
        member.setPlanName(request.getPlanName());
        member.setBillingCycle(request.getBillingCycle());
        member.setMethod(request.getMethod());
        member.setAmount(request.getAmount());
        member.setCurrency(request.getCurrency());
        member.setStatus(request.getStatus() != null ? request.getStatus() : "active");
        member.setPaymentReference(request.getPaymentReference());
        member.setPaymentId(request.getPaymentId());
        member.setName(request.getName());
        member.setEmail(request.getEmail());
        member.setPurchasedAt(request.getPurchasedAt() != null ? request.getPurchasedAt() : Instant.now());

        SubscriptionMember saved = subscriptionMemberRepository.save(member);
        return toSubscriptionDto(saved);
    }

    public SubscriptionDto updateFromPayment(Payment payment, String userId) {
        SubscriptionUpdateRequest request = new SubscriptionUpdateRequest();
        request.setPlanName(payment.getPlanName());
        request.setBillingCycle(payment.getBillingCycle());
        request.setMethod(payment.getMethod());
        request.setAmount(payment.getAmount());
        request.setCurrency(payment.getCurrency());
        request.setStatus(payment.getStatus());
        request.setPaymentReference(payment.getReferenceId());
        request.setPaymentId(payment.getId());
        request.setName(payment.getName());
        request.setEmail(payment.getEmail());
        request.setPurchasedAt(payment.getCreatedAt());
        return updateCurrentSubscription(request, userId);
    }

    private PlanDto toPlanDto(Plan p) {
        PlanDto dto = new PlanDto();
        dto.setId(p.getId());
        dto.setName(p.getName());
        dto.setDescription(p.getDescription());
        dto.setMonthlyPrice(p.getMonthlyPrice());
        dto.setYearlyPrice(p.getYearlyPrice());
        dto.setFeatured(p.isFeatured());
        dto.setPurchaseCount(p.getPurchaseCount());
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

    private SubscriptionDto toSubscriptionDto(SubscriptionMember member) {
        SubscriptionDto dto = new SubscriptionDto();
        dto.setId(member.getId());
        dto.setUserId(member.getUserId());
        dto.setOrganizationName(member.getOrganizationName());
        dto.setPlanName(member.getPlanName());
        dto.setBillingCycle(member.getBillingCycle());
        dto.setStatus(member.getStatus());
        dto.setMethod(member.getMethod());
        dto.setAmount(member.getAmount());
        dto.setCurrency(member.getCurrency());
        dto.setPaymentReference(member.getPaymentReference());
        dto.setPaymentId(member.getPaymentId());
        dto.setName(member.getName());
        dto.setEmail(member.getEmail());
        dto.setPurchasedAt(member.getPurchasedAt());
        Instant expiresAt = calculateExpiresAt(member.getPlanName(), member.getBillingCycle(), member.getPurchasedAt());
        dto.setExpiresAt(expiresAt);
        dto.setExpired(expiresAt != null && expiresAt.isBefore(Instant.now()));
        return dto;
    }

    private SubscriptionDto defaultSubscriptionDto() {
        SubscriptionDto dto = new SubscriptionDto();
        dto.setPlanName("Free");
        dto.setBillingCycle("monthly");
        dto.setStatus("active");
        dto.setExpired(false);
        planRepository.findByName("Free").ifPresent(plan -> {
            dto.setPlanName(plan.getName());
        });
        return dto;
    }

    private boolean isExpired(SubscriptionMember member) {
        Instant expiresAt = calculateExpiresAt(member.getPlanName(), member.getBillingCycle(), member.getPurchasedAt());
        return expiresAt != null && expiresAt.isBefore(Instant.now());
    }

    private Instant calculateExpiresAt(String planName, String billingCycle, Instant purchasedAt) {
        if (planName == null || planName.isBlank()) return null;
        String key = planName.trim().toLowerCase();
        if (key.contains("free")) return null;
        if (purchasedAt == null) return null;
        ZonedDateTime base = purchasedAt.atZone(ZoneId.systemDefault());
        if ("yearly".equalsIgnoreCase(billingCycle)) {
            return base.plusYears(1).toInstant();
        }
        return base.plusMonths(1).toInstant();
    }

}
