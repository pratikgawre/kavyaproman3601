package com.team1.backend.controller;

import com.team1.backend.service.EmailService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/email")
public class EmailController {

    private final EmailService emailService;

    public EmailController(EmailService emailService) {
        this.emailService = emailService;
    }

    @PostMapping("/send-invitation")
    public ResponseEntity<Map<String, String>> sendInvitationEmail(@RequestBody Map<String, String> request) {
        try {
            String recipientEmail = request.get("recipientEmail");
            String recipientName = request.get("recipientName");
            String role = request.get("role");
            String invitedBy = request.get("invitedBy");
            String organizationName = request.get("organizationName");

            emailService.sendInvitationEmail(recipientEmail, recipientName, role, invitedBy, organizationName);

            return ResponseEntity.ok(Map.of(
                "success", "true",
                "message", "Invitation email sent successfully"
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                "success", "false",
                "message", "Failed to send email: " + e.getMessage()
            ));
        }
    }
}
