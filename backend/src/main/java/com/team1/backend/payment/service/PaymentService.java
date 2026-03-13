package com.team1.backend.payment.service;

import com.team1.backend.payment.dto.PaymentRequest;
import com.team1.backend.payment.dto.PaymentResponse;
import com.team1.backend.payment.model.Payment;
import com.team1.backend.payment.repository.PaymentRepository;
import com.team1.backend.subscription.repository.PlanRepository;
import com.team1.backend.subscription.service.SubscriptionService;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final SubscriptionService subscriptionService;
    private final PlanRepository planRepository;

    public PaymentService(PaymentRepository paymentRepository,
                          SubscriptionService subscriptionService,
                          PlanRepository planRepository) {
        this.paymentRepository = paymentRepository;
        this.subscriptionService = subscriptionService;
        this.planRepository = planRepository;
    }

    public PaymentResponse confirmPayment(String userIdHeader, PaymentRequest request) {
        Payment payment = new Payment();
        String userId = request.getUserId();
        if ((userId == null || userId.isBlank()) && userIdHeader != null && !userIdHeader.isBlank()) {
            userId = userIdHeader;
        }
        payment.setUserId(userId);
        payment.setName(request.getName());
        payment.setEmail(request.getEmail());
        payment.setPlanName(normalizePlanName(request.getPlanName()));
        payment.setBillingCycle(normalizeBillingCycle(request.getBillingCycle()));
        payment.setMethod(request.getMethod());
        payment.setAmount(request.getAmount() != null ? request.getAmount() : 0.0);
        payment.setCurrency(request.getCurrency() != null ? request.getCurrency() : "USD");
        payment.setStatus("success");
        payment.setCreatedAt(Instant.now());
        payment.setReferenceId("PMT-" + System.currentTimeMillis());
        payment.setUpiId(request.getUpiId());
        payment.setCardLast4(request.getCardLast4());

        Payment saved = paymentRepository.save(payment);

        if (saved.getPlanName() != null) {
            subscriptionService.updateFromPayment(saved, saved.getUserId());
            bumpPlanCount(saved.getPlanName());
        }

        return toDto(saved);
    }

    private void bumpPlanCount(String planName) {
        if (planName == null || planName.isBlank()) return;
        planRepository.findByName(planName).ifPresent(plan -> {
            plan.setPurchaseCount(plan.getPurchaseCount() + 1);
            planRepository.save(plan);
        });
    }

    public PaymentResponse getPayment(String id) {
        return paymentRepository.findById(id).map(this::toDto).orElse(null);
    }

    public List<PaymentResponse> listPayments(String userIdHeader) {
        List<Payment> payments;
        if (userIdHeader == null || userIdHeader.isBlank()) {
            payments = paymentRepository.findAll();
        } else {
            payments = paymentRepository.findByUserIdOrderByCreatedAtDesc(userIdHeader);
        }
        return payments.stream().map(this::toDto).collect(Collectors.toList());
    }

    public byte[] generateInvoicePdf(String paymentId) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseGet(() -> paymentRepository.findByReferenceId(paymentId).orElse(null));
        if (payment == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment not found");
        }

        try (PDDocument document = new PDDocument()) {
            PDPage page = new PDPage();
            document.addPage(page);

            try (PDPageContentStream content = new PDPageContentStream(document, page)) {
                float startX = 72f;
                float startY = 720f;
                float lineHeight = 20f;

                content.beginText();
                content.setFont(PDType1Font.HELVETICA_BOLD, 18);
                content.newLineAtOffset(startX, startY);
                content.showText("Payment Invoice");
                content.endText();

                startY -= 40f;

                content.beginText();
                content.setFont(PDType1Font.HELVETICA, 12);
                content.newLineAtOffset(startX, startY);
                content.showText("Invoice: " + safe(payment.getReferenceId(), payment.getId()));
                content.endText();

                startY -= lineHeight;
                content.beginText();
                content.setFont(PDType1Font.HELVETICA, 12);
                content.newLineAtOffset(startX, startY);
                content.showText("Plan: " + safe(payment.getPlanName(), "N/A"));
                content.endText();

                startY -= lineHeight;
                content.beginText();
                content.setFont(PDType1Font.HELVETICA, 12);
                content.newLineAtOffset(startX, startY);
                content.showText("Name: " + safe(payment.getName(), "N/A"));
                content.endText();

                startY -= lineHeight;
                content.beginText();
                content.setFont(PDType1Font.HELVETICA, 12);
                content.newLineAtOffset(startX, startY);
                content.showText("Email: " + safe(payment.getEmail(), "N/A"));
                content.endText();

                startY -= lineHeight;
                content.beginText();
                content.setFont(PDType1Font.HELVETICA, 12);
                content.newLineAtOffset(startX, startY);
                content.showText("Amount: " + formatAmount(payment));
                content.endText();

                startY -= lineHeight;
                content.beginText();
                content.setFont(PDType1Font.HELVETICA, 12);
                content.newLineAtOffset(startX, startY);
                content.showText("Purchase Date: " + formatDate(payment.getCreatedAt()));
                content.endText();
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            document.save(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Unable to generate invoice");
        }
    }

    private PaymentResponse toDto(Payment payment) {
        PaymentResponse dto = new PaymentResponse();
        dto.setId(payment.getId());
        dto.setUserId(payment.getUserId());
        dto.setName(payment.getName());
        dto.setEmail(payment.getEmail());
        dto.setPlanName(payment.getPlanName());
        dto.setBillingCycle(payment.getBillingCycle());
        dto.setMethod(payment.getMethod());
        dto.setAmount(payment.getAmount());
        dto.setCurrency(payment.getCurrency());
        dto.setStatus(payment.getStatus());
        dto.setCreatedAt(payment.getCreatedAt());
        dto.setReferenceId(payment.getReferenceId());
        return dto;
    }

    private String normalizePlanName(String planName) {
        if (planName == null || planName.isBlank()) return null;
        String key = planName.trim().toLowerCase();
        if (key.contains("professional") || key.equals("pro")) return "Professional";
        if (key.contains("business")) return "Business";
        if (key.contains("enterprise")) return "Enterprise";
        if (key.contains("free")) return "Free";
        return planName.trim();
    }

    private String normalizeBillingCycle(String billingCycle) {
        if (billingCycle == null || billingCycle.isBlank()) return "monthly";
        String key = billingCycle.trim().toLowerCase();
        return key.equals("yearly") ? "yearly" : "monthly";
    }

    private String safe(String value, String fallback) {
        return (value == null || value.isBlank()) ? fallback : value;
    }

    private String formatDate(Instant instant) {
        if (instant == null) return "N/A";
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd MMM yyyy").withZone(ZoneId.systemDefault());
        return formatter.format(instant);
    }

    private String formatAmount(Payment payment) {
        double amount = payment.getAmount() != null ? payment.getAmount() : 0.0;
        String currency = payment.getCurrency() != null ? payment.getCurrency() : "USD";
        return currency + " " + String.format("%.2f", amount);
    }
}
