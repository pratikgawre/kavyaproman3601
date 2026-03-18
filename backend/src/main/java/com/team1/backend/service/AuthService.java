package com.team1.backend.service;

import java.security.SecureRandom;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.core.env.Environment;
import org.springframework.beans.factory.annotation.Value;

import com.team1.backend.dto.AuthResponse;
import com.team1.backend.dto.LoginRequest;
import com.team1.backend.dto.RegisterRequest;
import com.team1.backend.model.User;
import com.team1.backend.repository.UserRepository;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final EmailDeliveryService emailService;
    private final TwoFactorService twoFactorService;
    private final Environment environment;
    private final boolean otpDevLogEnabled;

    public AuthService(UserRepository userRepository,
                       BCryptPasswordEncoder passwordEncoder,
                       EmailDeliveryService emailService,
                       TwoFactorService twoFactorService,
                       Environment environment,
                       @Value("${auth.otp.dev-log.enabled:true}") boolean otpDevLogEnabled) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
        this.twoFactorService = twoFactorService;
        this.environment = environment;
        this.otpDevLogEnabled = otpDevLogEnabled;
    }

    public AuthResponse register(RegisterRequest req) {
        String email = req.getEmail() == null ? "" : req.getEmail().trim().toLowerCase();

        // enforce corporate email domain
        if (!email.endsWith("@kavyainfoweb.com")) {
            return new AuthResponse(false, "Use official email id");
        }

        if (userRepository.existsByEmail(email)) {
            return new AuthResponse(false, "Email already in use");
        }
        String hashed = passwordEncoder.encode(req.getPassword());
        User user = new User(req.getName(), email, hashed);
        // set role if provided
        if (req.getRole() != null && !req.getRole().isBlank()) {
            user.setRole(req.getRole());
        }

        // generate 6-digit OTP
        SecureRandom rnd = new SecureRandom();
        int code = rnd.nextInt(1_000_000);
        String otp = String.format("%06d", code);
        user.setVerificationCode(otp);
        user.setVerified(false);

        userRepository.save(user);

        // send OTP email
        String subject = "Your KavyaProMan verification code";
        String body = "<p>Hi " + user.getName() + ",</p>"
                + "<p>Your verification code is <b>" + otp + "</b>. Use this to complete your registration.</p>"
                + "<p>If you did not request this, ignore this email.</p>";
        boolean sent = sendOtpEmail(user, subject, body, otp, "register");
        if (!sent) {
            return new AuthResponse(false, "Failed to send verification email");
        }

        return successWithUser("OTP sent to email", user);
    }

    public AuthResponse login(LoginRequest req) {
        String email = req.getEmail() == null ? "" : req.getEmail().trim().toLowerCase();
        Optional<User> u = userRepository.findByEmail(email);
        if (u.isEmpty()) {
            return new AuthResponse(false, "Invalid credentials");
        }
        User user = u.get();
        if (!passwordEncoder.matches(req.getPassword(), user.getPassword())) {
            return new AuthResponse(false, "Invalid credentials");
        }

        // If Authenticator App 2FA is enabled, require a TOTP code instead of email OTP.
        if (user.isTwoFactorEnabled()) {
            AuthResponse res = successWithUser("2FA required", user);
            res.setTwoFactorRequired(true);
            return res;
        }

        // Always generate and send OTP for login (force OTP on every sign-in)
        SecureRandom rnd = new SecureRandom();
        int code = rnd.nextInt(1_000_000);
        String otp = String.format("%06d", code);
        user.setVerificationCode(otp);
        userRepository.save(user);

        String subject = "Your KavyaProMan verification code";
        String body = "<p>Hi " + user.getName() + ",</p>"
                + "<p>Your verification code is <b>" + otp + "</b>. Use this to complete your login.</p>"
                + "<p>If you did not request this, ignore this email.</p>";
        boolean sent = sendOtpEmail(user, subject, body, otp, "login");
        if (!sent) {
            return new AuthResponse(false, "Failed to send verification email");
        }
        return successWithUser("OTP sent to email", user);
    }

    public AuthResponse verifyOtp(String userId, String code) {
        Optional<User> u = userRepository.findById(userId);
        if (u.isEmpty()) return new AuthResponse(false, "User not found");
        User user = u.get();
        String stored = user.getVerificationCode();
        if (stored == null || stored.isBlank()) {
            if (user.isVerified()) return successWithUser("Already verified", user);
            return new AuthResponse(false, "No verification code found");
        }
        if (code == null || code.isBlank()) return new AuthResponse(false, "Missing verification code");
        if (!stored.equals(code)) return new AuthResponse(false, "Invalid verification code");
        user.setVerified(true);
        user.setVerificationCode(null);
        userRepository.save(user);
        return successWithUser("Verification successful", user);
    }

    public AuthResponse verifyTwoFactor(String userId, String code) {
        Optional<User> u = userRepository.findById(userId);
        if (u.isEmpty()) return new AuthResponse(false, "User not found");
        User user = u.get();
        if (!user.isTwoFactorEnabled()) return new AuthResponse(false, "2FA is not enabled");
        if (!twoFactorService.verifyEnabledCode(user, code)) return new AuthResponse(false, "Invalid 2FA code");
        return successWithUser("2FA verification successful", user);
    }

    public AuthResponse resendOtp(String userId) {
        Optional<User> u = userRepository.findById(userId);
        if (u.isEmpty()) return new AuthResponse(false, "User not found");
        User user = u.get();
        // generate 6-digit OTP
        SecureRandom rnd = new SecureRandom();
        int code = rnd.nextInt(1_000_000);
        String otp = String.format("%06d", code);
        user.setVerificationCode(otp);
        userRepository.save(user);

        String subject = "Your KavyaProMan verification code";
        String body = "<p>Hi " + user.getName() + ",</p>"
                + "<p>Your verification code is <b>" + otp + "</b>. Use this to complete your action.</p>"
                + "<p>If you did not request this, ignore this email.</p>";
        boolean sent = sendOtpEmail(user, subject, body, otp, "resend");
        if (!sent) {
            return new AuthResponse(false, "Failed to send verification email");
        }
        return successWithUser("OTP sent to email", user);
    }

    // forgot password: send reset OTP to email if user exists
    public AuthResponse forgotPassword(String email) {
        String normalized = email == null ? "" : email.trim().toLowerCase();
        Optional<User> u = userRepository.findByEmail(normalized);
        if (u.isEmpty()) return new AuthResponse(false, "User not found");
        User user = u.get();
        SecureRandom rnd = new SecureRandom();
        int code = rnd.nextInt(1_000_000);
        String otp = String.format("%06d", code);
        user.setVerificationCode(otp);
        userRepository.save(user);

        String subject = "KavyaProMan password reset code";
        String body = "<p>Hi " + user.getName() + ",</p>"
                + "<p>Your password reset code is <b>" + otp + "</b>. Use this to reset your password.</p>"
                + "<p>If you did not request this, ignore this email.</p>";
        boolean sent = sendOtpEmail(user, subject, body, otp, "forgot-password");
        if (!sent) return new AuthResponse(false, "Failed to send reset email");
        return successWithUser("Reset code sent", user);
    }

    public AuthResponse verifyResetCode(String userId, String code) {
        Optional<User> u = userRepository.findById(userId);
        if (u.isEmpty()) return new AuthResponse(false, "User not found");
        User user = u.get();
        String stored = user.getVerificationCode();
        if (stored == null || stored.isBlank()) return new AuthResponse(false, "No active reset code found");
        if (code == null || code.isBlank()) return new AuthResponse(false, "Missing reset code");
        if (!stored.equals(code)) return new AuthResponse(false, "Invalid reset code");
        return successWithUser("Reset code verified", user);
    }

    // reset password using code
    public AuthResponse resetPassword(String userId, String code, String newPassword) {
        Optional<User> u = userRepository.findById(userId);
        if (u.isEmpty()) return new AuthResponse(false, "User not found");
        User user = u.get();
        if (user.getVerificationCode() == null || !user.getVerificationCode().equals(code)) {
            return new AuthResponse(false, "Invalid reset code");
        }
        String hashed = passwordEncoder.encode(newPassword);
        user.setPassword(hashed);
        user.setVerificationCode(null);
        userRepository.save(user);
        return successWithUser("Password reset successful", user);
    }

    private AuthResponse successWithUser(String message, User user) {
        return new AuthResponse(true, message, user.getId(), user.getEmail(), user.getName(), user.getRole(), user.getAvatar());
    }

    private boolean sendOtpEmail(User user, String subject, String html, String otp, String reason) {
        boolean sent = emailService.sendHtmlEmail(user.getEmail(), subject, html, null);
        if (sent) return true;

        if (otpDevLogEnabled && !isProdProfile()) {
            log.warn("OTP delivery failed ({}). DEV fallback enabled; use this OTP to continue. userId={}, email={}, otp={}",
                    reason, user.getId(), user.getEmail(), otp);
            return true;
        }

        return false;
    }

    private boolean isProdProfile() {
        for (String profile : environment.getActiveProfiles()) {
            if ("prod".equalsIgnoreCase(profile)) return true;
        }
        return false;
    }
}
