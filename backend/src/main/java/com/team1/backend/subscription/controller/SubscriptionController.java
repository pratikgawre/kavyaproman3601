package com.team1.backend.subscription.controller;

import com.team1.backend.subscription.dto.InvoiceDto;
import com.team1.backend.subscription.dto.PlanDto;
import com.team1.backend.subscription.dto.SubscriptionDto;
import com.team1.backend.subscription.dto.SubscriptionUpdateRequest;
import com.team1.backend.subscription.service.SubscriptionService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/subscription")
public class SubscriptionController {

    private final SubscriptionService service;

    public SubscriptionController(SubscriptionService service) {
        this.service = service;
    }

    @GetMapping("/plans")
    public List<PlanDto> getPlans() {
        return service.getPlans();
    }

    @GetMapping("/invoices")
    public List<InvoiceDto> getInvoices() {
        return service.getInvoices();
    }

    @GetMapping("/current")
    public SubscriptionDto getCurrent(@RequestHeader(value = "X-USER-ID", required = false) String userId) {
        return service.getCurrentSubscription(userId);
    }

    @PutMapping("/current")
    public SubscriptionDto updateCurrent(@RequestHeader(value = "X-USER-ID", required = false) String userId,
                                          @RequestBody SubscriptionUpdateRequest request) {
        return service.updateCurrentSubscription(request, userId);
    }
}
