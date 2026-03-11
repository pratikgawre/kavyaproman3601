package com.team1.backend.controller;

import com.team1.backend.dto.ContactRequest;
import com.team1.backend.service.ContactVerificationService;
import com.team1.backend.service.SendGridEmailService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;

@RestController
@RequestMapping("/api/contact")
public class ContactController {

    private final ContactVerificationService verificationService;
    private final SendGridEmailService emailService;
    private final String receiverEmail;
    private final String frontendBaseUrl;

    public ContactController(ContactVerificationService verificationService,
                             SendGridEmailService emailService,
                             @Value("${contact.receiver.email:}") String receiverEmail,
                             @Value("${frontend.base-url:http://localhost:5173}") String frontendBaseUrl) {
        this.verificationService = verificationService;
        this.emailService = emailService;
        this.receiverEmail = receiverEmail;
        this.frontendBaseUrl = frontendBaseUrl == null ? "http://localhost:5173" : frontendBaseUrl.replaceAll("/+$", "");
    }

    @PostMapping("/send-verification")
    public ResponseEntity<?> sendVerification(@RequestBody java.util.Map<String,String> body) {
        String email = body.get("email");
        if (email == null || !email.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error","invalid email"));
        }
        String code = verificationService.generateCode(email);
        String subject = "Your verification code";
        // Include a convenient verification link that opens the frontend and triggers verification
        String frontendLink = frontendBaseUrl + "/contact-sales?email=" + java.net.URLEncoder.encode(email, java.nio.charset.StandardCharsets.UTF_8) + "&code=" + code;
        String html = "<div style=\"font-family:Arial,sans-serif;color:#0f172a;\">"
                + "<h2>Verify your email</h2>"
                + "<p>Your verification code is <strong>"+code+"</strong>. It expires in 10 minutes.</p>"
                + "<p><a href=\""+frontendLink+"\" style=\"display:inline-block;padding:10px 14px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;\">Verify in browser</a></p>"
                + "</div>";
        boolean sent = emailService.sendHtmlEmail(email, subject, html, null);
        if (!sent) {
            return ResponseEntity.status(500).body(java.util.Map.of("error","failed to send verification"));
        }
        return ResponseEntity.ok(java.util.Map.of("sent", true));
    }

    @PostMapping("/verify")
    public ResponseEntity<?> verifyCode(@RequestBody java.util.Map<String,String> body) {
        String email = body.get("email");
        String code = body.get("code");
        if (email == null || code == null) return ResponseEntity.badRequest().build();
        boolean ok = verificationService.verifyCode(email, code);
        return ok ? ResponseEntity.ok(java.util.Map.of("verified", true)) : ResponseEntity.status(400).body(java.util.Map.of("verified", false));
    }

    @PostMapping("/submit")
    public ResponseEntity<?> submit(@RequestBody ContactRequest req) {
        if (req == null || req.email == null || req.name == null || req.phone == null) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error","missing fields"));
        }
        // basic validation
        if (!req.email.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) return ResponseEntity.badRequest().body(java.util.Map.of("error","invalid email"));
        if (!req.phone.matches("^[0-9]{10}$")) return ResponseEntity.badRequest().body(java.util.Map.of("error","invalid phone"));
        // verify code
        if (req.verificationCode == null || !verificationService.verifyCode(req.email, req.verificationCode)) {
            return ResponseEntity.status(400).body(java.util.Map.of("error","email not verified"));
        }

        // build HTML email for company
        String subject = "New Contact Sales Request from " + req.name;
        String html = buildCompanyHtml(req);
        if (receiverEmail == null || receiverEmail.isBlank()) {
            return ResponseEntity.status(500).body(java.util.Map.of("error","contact receiver email is not configured"));
        }
        // send to company and set reply-to to the user's email so replies go to submitter
        boolean sent = emailService.sendHtmlEmail(receiverEmail, subject, html, req.email);
        if (!sent) return ResponseEntity.status(500).body(java.util.Map.of("error","failed to send to company"));

        return ResponseEntity.ok(java.util.Map.of("sent", true, "receivedAt", Instant.now().toString()));
    }

    private String buildCompanyHtml(ContactRequest req) {
        StringBuilder sb = new StringBuilder();
        sb.append("<div style=\"font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f8fafc;border-radius:8px;color:#0f172a;\">\n");
        sb.append("<div style=\"display:flex;align-items:center;gap:12px;margin-bottom:12px;\"><div style=\"width:48px;height:48px;border-radius:8px;background:#eef6ff;display:flex;align-items:center;justify-content:center;color:#2563eb;font-weight:700;\">KP</div><div><h2 style=\"margin:0;font-size:18px;\">New Contact Sales Request</h2><div style=\"color:#64748b;font-size:13px\">Submitted by "+escapeHtml(req.name)+"</div></div></div>");

        sb.append("<div style=\"background:#fff;padding:12px;border-radius:6px;border:1px solid #e6eefc;\">\n");
        sb.append("<p style=\"margin:6px 0;\"><strong>Name:</strong> "+escapeHtml(req.name)+"</p>");
        sb.append("<p style=\"margin:6px 0;\"><strong>Email:</strong> <a href=\"mailto:"+escapeHtml(req.email)+"\">"+escapeHtml(req.email)+"</a></p>");
        sb.append("<p style=\"margin:6px 0;\"><strong>Phone:</strong> "+escapeHtml(req.countryCode)+" "+escapeHtml(req.phone)+"</p>");
        sb.append("<p style=\"margin:6px 0;\"><strong>Message:</strong><br/>"+escapeHtml(req.message).replaceAll("\n","<br/>")+"</p>");
        sb.append("</div>");

        sb.append("<div style=\"margin-top:12px;display:flex;gap:8px;\">\n");
        sb.append("<a href=\"mailto:"+escapeHtml(req.email)+"?subject=Re:%20Contact%20Sales%20Request\" style=\"display:inline-block;padding:10px 14px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;\">Reply to user</a>");
        sb.append("<a href=\"#\" style=\"display:inline-block;padding:10px 14px;background:#0ea5a4;color:#fff;border-radius:6px;text-decoration:none;\">Open in dashboard</a>");
        sb.append("</div>");

        sb.append("</div>");
        return sb.toString();
    }

    private String escapeHtml(String s) {
        if (s == null) return "";
        return s.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;").replace("\"","&quot;").replace("'","&#39;");
    }
}
