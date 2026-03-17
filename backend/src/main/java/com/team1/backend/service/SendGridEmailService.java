package com.team1.backend.service;

import com.sendgrid.Method;
import com.sendgrid.Request;
import com.sendgrid.Response;
import com.sendgrid.SendGrid;
import com.sendgrid.helpers.mail.Mail;
import com.sendgrid.helpers.mail.objects.Attachments;
import com.sendgrid.helpers.mail.objects.Content;
import com.sendgrid.helpers.mail.objects.Email;
import com.sendgrid.helpers.mail.objects.Personalization;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Base64;

@Service
public class SendGridEmailService {

    private static final Logger log = LoggerFactory.getLogger(SendGridEmailService.class);

    private final SendGrid sg;
    private final String fromEmail;
    private final boolean enabled;

    public SendGridEmailService(@Value("${sendgrid.api.key:}") String apiKey,
                                @Value("${sendgrid.from.email:}") String fromEmail) {
        this.enabled = apiKey != null && !apiKey.isBlank() && fromEmail != null && !fromEmail.isBlank();
        this.sg = this.enabled ? new SendGrid(apiKey) : null;
        this.fromEmail = fromEmail;

        if (!this.enabled) {
            log.warn("SendGrid is disabled. Set 'sendgrid.api.key' and 'sendgrid.from.email' to enable email sending.");
        }
    }

    public boolean sendHtmlEmail(String toEmail, String subject, String htmlBody) {
        return sendHtmlEmail(toEmail, subject, htmlBody, null);
    }

    public boolean isEnabled() {
        return enabled;
    }

    public boolean sendHtmlEmail(String toEmail, String subject, String htmlBody, String replyToEmail) {
        return sendHtmlEmail(toEmail, subject, htmlBody, replyToEmail, null);
    }

    public boolean sendHtmlEmail(String toEmail, String subject, String htmlBody, String replyToEmail, EmailAttachment attachment) {
        if (!enabled) {
            log.warn("Email send skipped because SendGrid is disabled. to={}, subject={}", toEmail, subject);
            return false;
        }
        try {
            Email from = new Email(fromEmail);
            Email to = new Email(toEmail);
            Content content = new Content("text/html", htmlBody);
            Mail mail = new Mail();
            mail.setFrom(from);
            mail.setSubject(subject);
            mail.addContent(content);

            Personalization personalization = new Personalization();
            personalization.addTo(to);
            mail.addPersonalization(personalization);
            if (replyToEmail != null && !replyToEmail.isBlank()) {
                mail.setReplyTo(new Email(replyToEmail));
            }
            if (attachment != null && attachment.bytes() != null && attachment.bytes().length > 0) {
                Attachments att = new Attachments();
                att.setContent(Base64.getEncoder().encodeToString(attachment.bytes()));
                att.setType(attachment.contentType());
                att.setFilename(attachment.fileName());
                att.setDisposition("attachment");
                mail.addAttachments(att);
            }

            Request request = new Request();
            request.setMethod(Method.POST);
            request.setEndpoint("mail/send");
            request.setBody(mail.build());

            Response response = sg.api(request);
            int status = response.getStatusCode();
            if (status < 200 || status >= 300) {
                String body = response.getBody();
                log.error("SendGrid send failed. status={}, to={}, subject={}, body={}",
                        status, toEmail, subject, body == null ? "" : body);
                return false;
            }
            return true;
        } catch (Exception ex) {
            log.error("SendGrid send failed with exception. to={}, subject={}", toEmail, subject, ex);
            return false;
        }
    }
}
