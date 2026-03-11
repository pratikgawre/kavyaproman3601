package com.team1.backend.service;

import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class ContactVerificationService {

    private static class Entry {
        String code;
        Instant expiresAt;
        boolean verified;
    }

    private final Map<String, Entry> map = new ConcurrentHashMap<>();
    private final Random rnd = new Random();

    public String generateCode(String email) {
        String code = String.format("%06d", rnd.nextInt(1_000_000));
        Entry e = new Entry();
        e.code = code;
        e.expiresAt = Instant.now().plusSeconds(10 * 60); // 10 minutes
        e.verified = false;
        map.put(email.toLowerCase(), e);
        return code;
    }

    public boolean verifyCode(String email, String code) {
        Entry e = map.get(email.toLowerCase());
        if (e == null) return false;
        if (Instant.now().isAfter(e.expiresAt)) return false;
        if (e.code.equals(code)) {
            e.verified = true;
            return true;
        }
        return false;
    }

    public boolean isVerified(String email) {
        Entry e = map.get(email.toLowerCase());
        return e != null && e.verified && Instant.now().isBefore(e.expiresAt);
    }
}
