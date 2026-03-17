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
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.awt.Color;
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
                PDRectangle pageSize = page.getMediaBox();
                float pageWidth = pageSize.getWidth();
                float pageHeight = pageSize.getHeight();

                float cardWidth = 360f;
                float cardHeight = 520f;
                float cardX = (pageWidth - cardWidth) / 2f;
                float cardY = (pageHeight - cardHeight) / 2f;
                float headerHeight = 36f;
                float padding = 18f;

                Color borderColor = new Color(0xE2, 0xE8, 0xF0);
                Color headerBg = new Color(0xF1, 0xF5, 0xF9);
                Color textDark = new Color(0x11, 0x18, 0x27);
                Color muted = new Color(0x6B, 0x72, 0x80);
                Color lineColor = new Color(0xE5, 0xE7, 0xEB);

                // Card border
                content.setStrokingColor(borderColor);
                content.addRect(cardX, cardY, cardWidth, cardHeight);
                content.stroke();

                // Header bar
                content.setNonStrokingColor(headerBg);
                content.addRect(cardX, cardY + cardHeight - headerHeight, cardWidth, headerHeight);
                content.fill();

                String title = "PAYMENT INVOICE";
                float titleSize = 12f;
                float titleWidth = textWidth(PDType1Font.HELVETICA_BOLD, titleSize, title);
                float titleX = cardX + (cardWidth - titleWidth) / 2f;
                float titleY = cardY + cardHeight - headerHeight + (headerHeight - titleSize) / 2f + 2f;
                drawText(content, PDType1Font.HELVETICA_BOLD, titleSize, titleX, titleY, title, textDark);

                float cursorY = cardY + cardHeight - headerHeight - 20f;
                float leftX = cardX + padding;
                float rightX = cardX + cardWidth - padding;

                String invoiceLabel = "Invoice No:";
                String invoiceValue = safe(payment.getReferenceId(), payment.getId());
                drawText(content, PDType1Font.HELVETICA, 10f, leftX, cursorY, invoiceLabel, muted);
                float invoiceLabelWidth = textWidth(PDType1Font.HELVETICA, 10f, invoiceLabel);
                drawText(content, PDType1Font.HELVETICA_BOLD, 10f, leftX + invoiceLabelWidth + 6f, cursorY, invoiceValue, textDark);

                String dateLabel = "Purchase Date:";
                float dateLabelWidth = textWidth(PDType1Font.HELVETICA, 10f, dateLabel);
                drawText(content, PDType1Font.HELVETICA, 10f, rightX - dateLabelWidth, cursorY, dateLabel, muted);
                String dateValue = formatDate(payment.getCreatedAt());
                float dateValueWidth = textWidth(PDType1Font.HELVETICA_BOLD, 10f, dateValue);
                drawText(content, PDType1Font.HELVETICA_BOLD, 10f, rightX - dateValueWidth, cursorY - 14f, dateValue, textDark);

                cursorY -= 32f;
                drawLine(content, cardX + padding, cursorY, cardX + cardWidth - padding, cursorY, lineColor);
                cursorY -= 18f;

                drawText(content, PDType1Font.HELVETICA_BOLD, 11f, leftX, cursorY, "Customer Details", textDark);
                cursorY -= 18f;

                drawKeyValue(content, leftX, cursorY, "Name:", safe(payment.getName(), "N/A"));
                cursorY -= 16f;
                drawKeyValue(content, leftX, cursorY, "Email:", safe(payment.getEmail(), "N/A"));
                cursorY -= 16f;

                drawLine(content, cardX + padding, cursorY, cardX + cardWidth - padding, cursorY, lineColor);
                cursorY -= 18f;

                drawText(content, PDType1Font.HELVETICA_BOLD, 11f, leftX, cursorY, "Plan Details", textDark);
                cursorY -= 18f;

                drawKeyValue(content, leftX, cursorY, "Plan:", safe(payment.getPlanName(), "N/A"));
                cursorY -= 16f;
                drawKeyValue(content, leftX, cursorY, "Amount:", formatAmount(payment));
                cursorY -= 16f;

                drawLine(content, cardX + padding, cursorY, cardX + cardWidth - padding, cursorY, lineColor);
                cursorY -= 20f;

                String statusText = resolveStatusText(payment.getStatus());
                drawText(content, PDType1Font.HELVETICA, 10f, leftX, cursorY, "Status:", muted);

                float statusLabelWidth = textWidth(PDType1Font.HELVETICA, 10f, "Status:");
                float pillX = leftX + statusLabelWidth + 8f;
                float pillY = cursorY - 6f;
                float pillHeight = 16f;
                float pillTextSize = 9.5f;
                float pillTextWidth = textWidth(PDType1Font.HELVETICA_BOLD, pillTextSize, statusText);
                float pillWidth = pillTextWidth + 18f;

                Color pillColor = resolveStatusColor(payment.getStatus());
                content.setNonStrokingColor(pillColor);
                addRoundedRect(content, pillX, pillY, pillWidth, pillHeight, 8f);
                content.fill();

                float pillTextX = pillX + (pillWidth - pillTextWidth) / 2f;
                float pillTextY = pillY + (pillHeight - pillTextSize) / 2f + 1f;
                drawText(content, PDType1Font.HELVETICA_BOLD, pillTextSize, pillTextX, pillTextY, statusText, Color.WHITE);

                cursorY -= 26f;
                drawLine(content, cardX + padding, cursorY, cardX + cardWidth - padding, cursorY, lineColor);
                cursorY -= 24f;

                String thanks = "Thank you for your purchase";
                float thanksSize = 11f;
                float thanksWidth = textWidth(PDType1Font.HELVETICA_BOLD, thanksSize, thanks);
                float thanksX = cardX + (cardWidth - thanksWidth) / 2f;
                drawText(content, PDType1Font.HELVETICA_BOLD, thanksSize, thanksX, cursorY, thanks, textDark);
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

    private float textWidth(PDType1Font font, float size, String text) throws IOException {
        return font.getStringWidth(text) / 1000f * size;
    }

    private void drawText(PDPageContentStream content, PDType1Font font, float size, float x, float y, String text, Color color) throws IOException {
        content.beginText();
        content.setNonStrokingColor(color);
        content.setFont(font, size);
        content.newLineAtOffset(x, y);
        content.showText(text);
        content.endText();
    }

    private void drawLine(PDPageContentStream content, float x1, float y1, float x2, float y2, Color color) throws IOException {
        content.setStrokingColor(color);
        content.moveTo(x1, y1);
        content.lineTo(x2, y2);
        content.stroke();
    }

    private void drawKeyValue(PDPageContentStream content, float x, float y, String label, String value) throws IOException {
        drawText(content, PDType1Font.HELVETICA, 10f, x, y, label, new Color(0x6B, 0x72, 0x80));
        float labelWidth = textWidth(PDType1Font.HELVETICA, 10f, label);
        drawText(content, PDType1Font.HELVETICA_BOLD, 10f, x + labelWidth + 6f, y, value, new Color(0x11, 0x18, 0x27));
    }

    private void addRoundedRect(PDPageContentStream content, float x, float y, float w, float h, float r) throws IOException {
        float k = 0.552284749831f;
        float c = r * k;
        content.moveTo(x + r, y);
        content.lineTo(x + w - r, y);
        content.curveTo(x + w - r + c, y, x + w, y + r - c, x + w, y + r);
        content.lineTo(x + w, y + h - r);
        content.curveTo(x + w, y + h - r + c, x + w - r + c, y + h, x + w - r, y + h);
        content.lineTo(x + r, y + h);
        content.curveTo(x + r - c, y + h, x, y + h - r + c, x, y + h - r);
        content.lineTo(x, y + r);
        content.curveTo(x, y + r - c, x + r - c, y, x + r, y);
        content.closePath();
    }

    private String resolveStatusText(String status) {
        if (status == null || status.isBlank()) return "Payment Successful";
        String key = status.trim().toLowerCase();
        if (key.contains("success")) return "Payment Successful";
        if (key.contains("fail")) return "Payment Failed";
        if (key.contains("pending")) return "Payment Pending";
        return status.trim();
    }

    private Color resolveStatusColor(String status) {
        if (status == null || status.isBlank()) return new Color(0x6F, 0xB9, 0x6A);
        String key = status.trim().toLowerCase();
        if (key.contains("success")) return new Color(0x6F, 0xB9, 0x6A);
        if (key.contains("fail")) return new Color(0xF8, 0x71, 0x71);
        if (key.contains("pending")) return new Color(0xF8, 0xB4, 0x4B);
        return new Color(0x6F, 0xB9, 0x6A);
    }
}
