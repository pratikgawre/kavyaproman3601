package com.team1.backend.service;

import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;

@Service
public class EmailDeliveryService {

    private final SendGridEmailService sendGridEmailService;
    private final SmtpEmailService smtpEmailService;
    private final String preferProvider;

    public EmailDeliveryService(SendGridEmailService sendGridEmailService,
                                SmtpEmailService smtpEmailService,
                                @Value("${email.delivery.prefer:sendgrid}") String preferProvider) {
        this.sendGridEmailService = sendGridEmailService;
        this.smtpEmailService = smtpEmailService;
        this.preferProvider = preferProvider == null ? "sendgrid" : preferProvider.trim().toLowerCase();
    }

    public boolean sendHtmlEmail(String toEmail, String subject, String htmlBody, String replyToEmail) {
        return sendHtmlEmail(toEmail, subject, htmlBody, replyToEmail, null);
    }

    public boolean sendHtmlEmail(String toEmail, String subject, String htmlBody, String replyToEmail, EmailAttachment attachment) {
        if ("smtp".equals(preferProvider)) {
            return smtpEmailService.sendHtmlEmail(toEmail, subject, htmlBody, replyToEmail, attachment);
        }

        if ("sendgrid".equals(preferProvider)) {
            return sendGridEmailService.sendHtmlEmail(toEmail, subject, htmlBody, replyToEmail, attachment);
        }

        if ("auto".equals(preferProvider)) {
            if (sendGridEmailService.isEnabled()) {
                if (sendGridEmailService.sendHtmlEmail(toEmail, subject, htmlBody, replyToEmail, attachment)) {
                    return true;
                }
            }
            return smtpEmailService.sendHtmlEmail(toEmail, subject, htmlBody, replyToEmail, attachment);
        }

        if (sendGridEmailService.isEnabled()) {
            if (sendGridEmailService.sendHtmlEmail(toEmail, subject, htmlBody, replyToEmail, attachment)) {
                return true;
            }
        }
        return smtpEmailService.sendHtmlEmail(toEmail, subject, htmlBody, replyToEmail, attachment);
    }
}
