package com.team1.backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.team1.backend.dto.TwoFactorCodeRequest;
import com.team1.backend.dto.TwoFactorSetupResponse;
import com.team1.backend.dto.TwoFactorStatusResponse;
import com.team1.backend.service.TwoFactorService;

@RestController
@RequestMapping("/api/2fa")
public class TwoFactorController {

    private final TwoFactorService twoFactorService;

    public TwoFactorController(TwoFactorService twoFactorService) {
        this.twoFactorService = twoFactorService;
    }

    @GetMapping("/status")
    public ResponseEntity<TwoFactorStatusResponse> status(@RequestHeader("X-USER-ID") String userId) {
        return ResponseEntity.ok(twoFactorService.getStatus(userId));
    }

    @PostMapping("/setup")
    public ResponseEntity<TwoFactorSetupResponse> setup(@RequestHeader("X-USER-ID") String userId) {
        return ResponseEntity.ok(twoFactorService.beginSetup(userId));
    }

    @PostMapping("/confirm")
    public ResponseEntity<TwoFactorStatusResponse> confirm(
            @RequestHeader("X-USER-ID") String userId,
            @RequestBody TwoFactorCodeRequest req) {
        if (req == null || req.getCode() == null || req.getCode().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing code");
        }
        return ResponseEntity.ok(twoFactorService.confirmSetup(userId, req.getCode()));
    }

    @PostMapping("/disable")
    public ResponseEntity<TwoFactorStatusResponse> disable(@RequestHeader("X-USER-ID") String userId) {
        return ResponseEntity.ok(twoFactorService.disable(userId));
    }
}

