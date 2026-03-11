package com.team1.backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.team1.backend.dto.AuthResponse;
import com.team1.backend.dto.LoginRequest;
import com.team1.backend.dto.RegisterRequest;
import com.team1.backend.service.AuthService;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody RegisterRequest req) {
        AuthResponse res = authService.register(req);
        if (!res.isSuccess()) {
            return ResponseEntity.badRequest().body(res);
        }
        return ResponseEntity.ok(res);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest req) {
        AuthResponse res = authService.login(req);
        if (!res.isSuccess()) {
            return ResponseEntity.status(401).body(res);
        }
        return ResponseEntity.ok(res);
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<AuthResponse> verifyOtp(@RequestBody com.team1.backend.dto.VerifyOtpRequest req) {
        if (req == null || req.getUserId() == null || req.getUserId().isBlank() || req.getCode() == null || req.getCode().isBlank()) {
            return ResponseEntity.badRequest().body(new AuthResponse(false, "Missing userId or code"));
        }
        AuthResponse res = authService.verifyOtp(req.getUserId(), req.getCode());
        if (!res.isSuccess()) {
            return ResponseEntity.badRequest().body(res);
        }
        return ResponseEntity.ok(res);
    }

    @PostMapping("/resend-otp")
    public ResponseEntity<AuthResponse> resendOtp(@RequestBody com.team1.backend.dto.VerifyOtpRequest req) {
        if (req == null || req.getUserId() == null || req.getUserId().isBlank()) {
            return ResponseEntity.badRequest().body(new AuthResponse(false, "Missing userId"));
        }
        AuthResponse res = authService.resendOtp(req.getUserId());
        if (!res.isSuccess()) {
            return ResponseEntity.badRequest().body(res);
        }
        return ResponseEntity.ok(res);
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<AuthResponse> forgotPassword(@RequestBody com.team1.backend.dto.ForgotPasswordRequest req) {
        AuthResponse res = authService.forgotPassword(req.getEmail());
        if (!res.isSuccess()) {
            return ResponseEntity.badRequest().body(res);
        }
        return ResponseEntity.ok(res);
    }

    @PostMapping("/reset-password")
    public ResponseEntity<AuthResponse> resetPassword(@RequestBody com.team1.backend.dto.ResetPasswordRequest req) {
        if (req == null || req.getUserId() == null || req.getUserId().isBlank() || req.getCode() == null || req.getCode().isBlank() || req.getNewPassword() == null || req.getNewPassword().isBlank()) {
            return ResponseEntity.badRequest().body(new AuthResponse(false, "Missing userId, code, or new password"));
        }
        AuthResponse res = authService.resetPassword(req.getUserId(), req.getCode(), req.getNewPassword());
        if (!res.isSuccess()) {
            return ResponseEntity.badRequest().body(res);
        }
        return ResponseEntity.ok(res);
    }
}
