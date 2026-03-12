package com.team1.backend.payment.service;

import com.team1.backend.payment.dto.PaymentMethodDto;
import com.team1.backend.payment.dto.PaymentMethodRequest;
import com.team1.backend.payment.model.PaymentMethod;
import com.team1.backend.payment.repository.PaymentMethodRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class PaymentMethodService {

    private final PaymentMethodRepository repository;

    public PaymentMethodService(PaymentMethodRepository repository) {
        this.repository = repository;
    }

    public PaymentMethodDto addMethod(String userIdHeader, PaymentMethodRequest request) {
        PaymentMethod method = new PaymentMethod();
        String userId = request.getUserId();
        if ((userId == null || userId.isBlank()) && userIdHeader != null && !userIdHeader.isBlank()) {
            userId = userIdHeader;
        }
        method.setUserId(userId);
        method.setType(request.getType());
        method.setUpiId(request.getUpiId());
        method.setCardLast4(request.getCardLast4());
        method.setCardHolderName(request.getCardHolderName());
        method.setCreatedAt(Instant.now());
        return toDto(repository.save(method));
    }

    public List<PaymentMethodDto> listMethods(String userIdHeader) {
        if (userIdHeader == null || userIdHeader.isBlank()) {
            return repository.findAll().stream().map(this::toDto).collect(Collectors.toList());
        }
        return repository.findByUserId(userIdHeader).stream().map(this::toDto).collect(Collectors.toList());
    }

    public void removeMethod(String id) {
        repository.deleteById(id);
    }

    private PaymentMethodDto toDto(PaymentMethod method) {
        PaymentMethodDto dto = new PaymentMethodDto();
        dto.setId(method.getId());
        dto.setUserId(method.getUserId());
        dto.setType(method.getType());
        dto.setUpiId(method.getUpiId());
        dto.setCardLast4(method.getCardLast4());
        dto.setCardHolderName(method.getCardHolderName());
        dto.setCreatedAt(method.getCreatedAt());
        return dto;
    }
}
