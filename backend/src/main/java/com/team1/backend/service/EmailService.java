package com.team1.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.HttpEntity;

import java.util.HashMap;
import java.util.Map;

@Service
public class EmailService {

    @Value("${sendgrid.api.key:}")
    private String sendGridApiKey;

    @Value("${sendgrid.from.email:kavyalearn.info@gmail.com}")
    private String fromEmail;

    private final RestTemplate restTemplate = new RestTemplate();

    public void sendInvitationEmail(String recipientEmail, String recipientName, String role, 
                                    String invitedBy, String organizationName) throws Exception {
        if (sendGridApiKey == null || sendGridApiKey.isEmpty()) {
            throw new Exception("SendGrid API key not configured");
        }

        String subject = "You're invited to join " + organizationName + " on KavyaProMan";
        String htmlContent = buildInvitationEmailHtml(recipientName, role, invitedBy, organizationName);

        sendEmailViaSendGrid(recipientEmail, subject, htmlContent);
    }

    private void sendEmailViaSendGrid(String recipientEmail, String subject, String htmlContent) throws Exception {
        String sendGridUrl = "https://api.sendgrid.com/v3/mail/send";

        Map<String, Object> emailRequest = new HashMap<>();
        
        Map<String, String> fromMap = new HashMap<>();
        fromMap.put("email", fromEmail);
        fromMap.put("name", "KavyaProMan");
        emailRequest.put("from", fromMap);

        Map<String, Object> personalization = new HashMap<>();
        Map<String, String> toMap = new HashMap<>();
        toMap.put("email", recipientEmail);
        personalization.put("to", new Object[]{toMap});
        personalization.put("subject", subject);
        emailRequest.put("personalizations", new Object[]{personalization});

        Map<String, String> contentMap = new HashMap<>();
        contentMap.put("type", "text/html");
        contentMap.put("value", htmlContent);
        emailRequest.put("content", new Object[]{contentMap});

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Bearer " + sendGridApiKey);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(emailRequest, headers);
        restTemplate.postForObject(sendGridUrl, entity, String.class);
    }

    private String buildInvitationEmailHtml(String recipientName, String role, String invitedBy, String organizationName) {
        String html = "<!DOCTYPE html>" +
            "<html>" +
            "<head>" +
            "<style>" +
            "body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }" +
            ".container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }" +
            ".header { background-color: #007bff; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }" +
            ".content { background-color: white; padding: 20px; border-radius: 0 0 5px 5px; }" +
            ".button { display: inline-block; background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 20px; }" +
            ".footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }" +
            "</style>" +
            "</head>" +
            "<body>" +
            "<div class=\"container\">" +
            "<div class=\"header\">" +
            "<h1>Welcome to KavyaProMan!</h1>" +
            "</div>" +
            "<div class=\"content\">" +
            "<p>Hi <strong>" + recipientName + "</strong>,</p>" +
            "<p><strong>" + invitedBy + "</strong> has invited you to join <strong>" + organizationName + "</strong> on KavyaProMan as a <strong>" + role + "</strong>.</p>" +
            "<p>KavyaProMan is a powerful project management and team collaboration tool designed to help teams work more efficiently and transparently.</p>" +
            "<p><strong>Key Features:</strong></p>" +
            "<ul>" +
            "<li>Project Management</li>" +
            "<li>Team Collaboration</li>" +
            "<li>Issue Tracking &amp; Reporting</li>" +
            "<li>Workload Management</li>" +
            "<li>Analytics &amp; Insights</li>" +
            "</ul>" +
            "<p>Click the button below to accept the invitation and get started:</p>" +
            "<a href=\"http://localhost:3001/teams\" class=\"button\">Accept Invitation</a>" +
            "<p>If you did not request this invitation, please ignore this email or contact support.</p>" +
            "<div class=\"footer\">" +
            "<p>Best regards,<br/>The KavyaProMan Team</p>" +
            "<p>Copyright 2026 KavyaProMan. All rights reserved.</p>" +
            "</div>" +
            "</div>" +
            "</div>" +
            "</body>" +
            "</html>";
        return html;
    }
}
