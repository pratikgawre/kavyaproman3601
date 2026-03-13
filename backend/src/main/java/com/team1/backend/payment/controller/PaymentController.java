package com.team1.backend.payment.controller;

import com.team1.backend.payment.dto.PaymentRequest;
import com.team1.backend.payment.dto.PaymentResponse;
import com.team1.backend.payment.service.PaymentService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/payment")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/confirm")
    public PaymentResponse confirmPayment(
            @RequestHeader(value = "X-USER-ID", required = false) String userId,
            @RequestBody PaymentRequest request
    ) {
        return paymentService.confirmPayment(userId, request);
    }

    @GetMapping("/{id}")
    public PaymentResponse getPayment(@PathVariable String id) {
        return paymentService.getPayment(id);
    }

    @GetMapping("/{id}/invoice")
    public ResponseEntity<byte[]> downloadInvoice(@PathVariable String id) {
        byte[] pdf = paymentService.generateInvoicePdf(id);
        String filename = "invoice-" + id + ".pdf";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    @GetMapping
    public List<PaymentResponse> listPayments(
            @RequestHeader(value = "X-USER-ID", required = false) String userId
    ) {
        return paymentService.listPayments(userId);
    }
}
