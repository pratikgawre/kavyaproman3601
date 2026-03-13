package com.team1.backend.payment.controller;

import com.team1.backend.payment.dto.PaymentMethodDto;
import com.team1.backend.payment.dto.PaymentMethodRequest;
import com.team1.backend.payment.service.PaymentMethodService;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/payment-methods")
public class PaymentMethodController {

    private final PaymentMethodService paymentMethodService;

    public PaymentMethodController(PaymentMethodService paymentMethodService) {
        this.paymentMethodService = paymentMethodService;
    }

    @PostMapping
    public PaymentMethodDto addMethod(
            @RequestHeader(value = "X-USER-ID", required = false) String userId,
            @RequestBody PaymentMethodRequest request
    ) {
        return paymentMethodService.addMethod(userId, request);
    }

    @GetMapping
    public List<PaymentMethodDto> listMethods(
            @RequestHeader(value = "X-USER-ID", required = false) String userId
    ) {
        return paymentMethodService.listMethods(userId);
    }

    @DeleteMapping("/{id}")
    public void deleteMethod(@PathVariable String id) {
        paymentMethodService.removeMethod(id);
    }
}
