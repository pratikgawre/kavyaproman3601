package com.team1.backend.dto;

public class AuthResponse {
    private boolean success;
    private String message;
    private String userId;
    private String email;
    private String name;
    private String role;
    private String avatar;
    private boolean twoFactorRequired;

    public AuthResponse() {}

    public AuthResponse(boolean success, String message) {
        this.success = success;
        this.message = message;
    }

    public AuthResponse(boolean success, String message, String userId, String email) {
        this.success = success;
        this.message = message;
        this.userId = userId;
        this.email = email;
    }

    public AuthResponse(boolean success, String message, String userId, String email, String name, String role) {
        this.success = success;
        this.message = message;
        this.userId = userId;
        this.email = email;
        this.name = name;
        this.role = role;
    }

    public AuthResponse(boolean success, String message, String userId, String email, String name, String role, String avatar) {
        this.success = success;
        this.message = message;
        this.userId = userId;
        this.email = email;
        this.name = name;
        this.role = role;
        this.avatar = avatar;
    }

    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getAvatar() {
        return avatar;
    }

    public void setAvatar(String avatar) {
        this.avatar = avatar;
    }

    public boolean isTwoFactorRequired() {
        return twoFactorRequired;
    }

    public void setTwoFactorRequired(boolean twoFactorRequired) {
        this.twoFactorRequired = twoFactorRequired;
    }
}
