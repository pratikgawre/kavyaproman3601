package com.team1.backend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "users")
public class User {

    @Id
    private String id;

    private String name;

    @Indexed(unique = true)
    private String email;

    private String password;

    // new profile fields for settings
    private String avatar;           // base64 or URL

    private String role = "Member";

    private String timezone = "UTC";

    private NotificationPreferences notificationPreferences = new NotificationPreferences();

    private boolean verified = false;

    private String verificationCode;

    // TOTP (Authenticator App) 2FA
    private boolean twoFactorEnabled = false;

    // Base32 secret used when 2FA is enabled
    private String twoFactorSecret;

    // Base32 secret generated during setup (until confirmed)
    private String twoFactorPendingSecret;

    public User() {}

    public User(String name, String email, String password) {
        this.name = name;
        this.email = email;
        this.password = password;
    }

    // convenience constructor used when creating a user with full profile
    public User(String name, String email, String password, String avatar, String role, String timezone) {
        this.name = name;
        this.email = email;
        this.password = password;
        this.avatar = avatar;
        this.role = role;
        this.timezone = timezone;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getAvatar() {
        return avatar;
    }

    public void setAvatar(String avatar) {
        this.avatar = avatar;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getTimezone() {
        return timezone;
    }

    public void setTimezone(String timezone) {
        this.timezone = timezone;
    }

    public NotificationPreferences getNotificationPreferences() {
        if (notificationPreferences == null) {
            notificationPreferences = new NotificationPreferences();
        }
        return notificationPreferences;
    }

    public void setNotificationPreferences(NotificationPreferences notificationPreferences) {
        this.notificationPreferences = notificationPreferences == null ? new NotificationPreferences() : notificationPreferences;
    }

    public boolean isVerified() {
        return verified;
    }

    public void setVerified(boolean verified) {
        this.verified = verified;
    }

    public String getVerificationCode() {
        return verificationCode;
    }

    public void setVerificationCode(String verificationCode) {
        this.verificationCode = verificationCode;
    }

    public boolean isTwoFactorEnabled() {
        return twoFactorEnabled;
    }

    public void setTwoFactorEnabled(boolean twoFactorEnabled) {
        this.twoFactorEnabled = twoFactorEnabled;
    }

    public String getTwoFactorSecret() {
        return twoFactorSecret;
    }

    public void setTwoFactorSecret(String twoFactorSecret) {
        this.twoFactorSecret = twoFactorSecret;
    }

    public String getTwoFactorPendingSecret() {
        return twoFactorPendingSecret;
    }

    public void setTwoFactorPendingSecret(String twoFactorPendingSecret) {
        this.twoFactorPendingSecret = twoFactorPendingSecret;
    }
}
