package com.team1.backend.util;

import java.nio.ByteBuffer;
import java.security.GeneralSecurityException;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

public final class TotpUtil {
    private static final int DEFAULT_DIGITS = 6;
    private static final int DEFAULT_PERIOD_SECONDS = 30;
    private static final int DEFAULT_WINDOW_STEPS = 1;

    private TotpUtil() {}

    public static boolean verifyCode(String base32Secret, String code) {
        return verifyCode(base32Secret, code, System.currentTimeMillis(), DEFAULT_DIGITS, DEFAULT_PERIOD_SECONDS, DEFAULT_WINDOW_STEPS);
    }

    public static boolean verifyCode(String base32Secret, String code, long nowMillis, int digits, int periodSeconds, int windowSteps) {
        String normalized = normalizeCode(code, digits);
        if (normalized == null) {
            return false;
        }

        byte[] secret;
        try {
            secret = Base32.decode(base32Secret);
        } catch (IllegalArgumentException ex) {
            return false;
        }

        long timeStep = (nowMillis / 1000L) / (long) periodSeconds;
        for (int i = -windowSteps; i <= windowSteps; i++) {
            String expected = generateCode(secret, timeStep + i, digits);
            if (constantTimeEquals(expected, normalized)) {
                return true;
            }
        }
        return false;
    }

    private static String normalizeCode(String code, int digits) {
        if (code == null) return null;
        String c = code.trim().replaceAll("\\s+", "");
        if (!c.matches("\\d{" + digits + "}")) return null;
        return c;
    }

    private static String generateCode(byte[] secret, long timeStep, int digits) {
        try {
            Mac mac = Mac.getInstance("HmacSHA1");
            mac.init(new SecretKeySpec(secret, "HmacSHA1"));

            byte[] data = ByteBuffer.allocate(8).putLong(timeStep).array();
            byte[] hash = mac.doFinal(data);

            int offset = hash[hash.length - 1] & 0x0F;
            int binary =
                    ((hash[offset] & 0x7F) << 24) |
                    ((hash[offset + 1] & 0xFF) << 16) |
                    ((hash[offset + 2] & 0xFF) << 8) |
                    (hash[offset + 3] & 0xFF);

            int mod = 1;
            for (int i = 0; i < digits; i++) mod *= 10;
            int otp = binary % mod;

            String s = Integer.toString(otp);
            if (s.length() >= digits) return s;
            StringBuilder padded = new StringBuilder(digits);
            for (int i = s.length(); i < digits; i++) padded.append('0');
            padded.append(s);
            return padded.toString();
        } catch (GeneralSecurityException ex) {
            throw new IllegalStateException("Failed to generate TOTP code", ex);
        }
    }

    private static boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null) return false;
        if (a.length() != b.length()) return false;
        int result = 0;
        for (int i = 0; i < a.length(); i++) {
            result |= a.charAt(i) ^ b.charAt(i);
        }
        return result == 0;
    }
}

