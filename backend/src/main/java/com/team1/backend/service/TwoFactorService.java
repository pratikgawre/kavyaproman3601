package com.team1.backend.service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.EnumMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.team1.backend.dto.TwoFactorSetupResponse;
import com.team1.backend.dto.TwoFactorStatusResponse;
import com.team1.backend.model.User;
import com.team1.backend.repository.UserRepository;
import com.team1.backend.util.Base32;
import com.team1.backend.util.TotpUtil;

@Service
public class TwoFactorService {
    private static final int SECRET_BYTES = 20;
    private static final int QR_SIZE = 220;

    private final UserRepository userRepository;
    private final SecureRandom secureRandom = new SecureRandom();
    private final String issuer;

    public TwoFactorService(UserRepository userRepository,
                            @Value("${security.2fa.issuer:KavyaProMan360}") String issuer) {
        this.userRepository = userRepository;
        this.issuer = issuer == null || issuer.isBlank() ? "KavyaProMan360" : issuer.trim();
    }

    public TwoFactorStatusResponse getStatus(String userId) {
        User user = getUserOrThrow(userId);
        boolean pending = hasText(user.getTwoFactorPendingSecret());
        return new TwoFactorStatusResponse(user.isTwoFactorEnabled(), pending);
    }

    public TwoFactorSetupResponse beginSetup(String userId) {
        User user = getUserOrThrow(userId);
        if (user.isTwoFactorEnabled()) {
            return new TwoFactorSetupResponse(true, false, null, null, null);
        }

        String secret = safeText(user.getTwoFactorPendingSecret());
        if (secret == null) {
            secret = generateSecret();
            user.setTwoFactorPendingSecret(secret);
            userRepository.save(user);
        }

        String otpauthUri = buildOtpAuthUri(user.getEmail(), secret);
        String qrDataUrl = generateQrCodeDataUrl(otpauthUri);

        return new TwoFactorSetupResponse(false, true, qrDataUrl, secret, otpauthUri);
    }

    public TwoFactorStatusResponse confirmSetup(String userId, String code) {
        User user = getUserOrThrow(userId);
        if (user.isTwoFactorEnabled()) {
            return new TwoFactorStatusResponse(true, false);
        }

        String secret = safeText(user.getTwoFactorPendingSecret());
        if (secret == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "2FA setup not started");
        }

        if (!TotpUtil.verifyCode(secret, code)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid 2FA code");
        }

        user.setTwoFactorEnabled(true);
        user.setTwoFactorSecret(secret);
        user.setTwoFactorPendingSecret(null);
        userRepository.save(user);

        return new TwoFactorStatusResponse(true, false);
    }

    public TwoFactorStatusResponse disable(String userId) {
        User user = getUserOrThrow(userId);
        user.setTwoFactorEnabled(false);
        user.setTwoFactorSecret(null);
        user.setTwoFactorPendingSecret(null);
        userRepository.save(user);
        return new TwoFactorStatusResponse(false, false);
    }

    public boolean verifyEnabledCode(User user, String code) {
        if (user == null || !user.isTwoFactorEnabled()) return false;
        String secret = safeText(user.getTwoFactorSecret());
        if (secret == null) return false;
        return TotpUtil.verifyCode(secret, code);
    }

    private User getUserOrThrow(String userId) {
        if (userId == null || userId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing user id");
        }
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private String generateSecret() {
        byte[] bytes = new byte[SECRET_BYTES];
        secureRandom.nextBytes(bytes);
        return Base32.encode(bytes);
    }

    private String buildOtpAuthUri(String email, String secret) {
        String account = email == null ? "" : email.trim().toLowerCase();
        if (account.isBlank()) account = "user";

        String issuerEnc = urlEncode(issuer);
        String label = issuerEnc + ":" + urlEncode(account);

        return "otpauth://totp/" + label
                + "?secret=" + secret
                + "&issuer=" + issuerEnc
                + "&algorithm=SHA1&digits=6&period=30";
    }

    private String generateQrCodeDataUrl(String text) {
        try {
            QRCodeWriter writer = new QRCodeWriter();
            Map<EncodeHintType, Object> hints = new EnumMap<>(EncodeHintType.class);
            hints.put(EncodeHintType.MARGIN, 1);

            BitMatrix matrix = writer.encode(text, BarcodeFormat.QR_CODE, QR_SIZE, QR_SIZE, hints);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(matrix, "PNG", out);

            String base64 = Base64.getEncoder().encodeToString(out.toByteArray());
            return "data:image/png;base64," + base64;
        } catch (WriterException | IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to generate QR code");
        }
    }

    private static String urlEncode(String s) {
        if (s == null) return "";
        String encoded = URLEncoder.encode(s, StandardCharsets.UTF_8);
        return encoded.replace("+", "%20");
    }

    private static boolean hasText(String s) {
        return s != null && !s.trim().isEmpty();
    }

    private static String safeText(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }
}

