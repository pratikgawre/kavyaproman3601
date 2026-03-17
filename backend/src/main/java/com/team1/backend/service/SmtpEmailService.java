package com.team1.backend.service;

import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class SmtpEmailService {

    private static final Logger log = LoggerFactory.getLogger(SmtpEmailService.class);

    private final JavaMailSender mailSender;
    private final String fromEmail;
    private final boolean enabled;

    public SmtpEmailService(ObjectProvider<JavaMailSender> mailSenderProvider,
                            @Value("${smtp.from.email:${spring.mail.username:}}") String fromEmail) {
        this.mailSender = mailSenderProvider.getIfAvailable();
        this.fromEmail = fromEmail == null ? "" : fromEmail.trim();
        this.enabled = this.mailSender != null && !this.fromEmail.isBlank();

        if (!this.enabled) {
            log.warn("SMTP email is disabled. Configure spring.mail.* and smtp.from.email to enable SMTP fallback.");
        }
    }

    public boolean isEnabled() {
        return enabled;
    }

    public boolean sendHtmlEmail(String toEmail, String subject, String htmlBody, String replyToEmail) {
        return sendHtmlEmail(toEmail, subject, htmlBody, replyToEmail, null);
    }

    public boolean sendHtmlEmail(String toEmail, String subject, String htmlBody, String replyToEmail, EmailAttachment attachment) {
        if (!enabled) {
            log.warn("SMTP send skipped because SMTP is disabled. to={}, subject={}", toEmail, subject);
            return false;
        }
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, attachment != null, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            if (replyToEmail != null && !replyToEmail.isBlank()) {
                helper.setReplyTo(replyToEmail);
            }
            if (attachment != null && attachment.bytes() != null && attachment.bytes().length > 0) {
                helper.addAttachment(attachment.fileName(), new ByteArrayResource(attachment.bytes()), attachment.contentType());
            }
            mailSender.send(message);
            return true;
        } catch (Exception ex) {
            log.error("SMTP send failed. to={}, subject={}", toEmail, subject, ex);
            return false;
        }
    }
}
