package com.team1.backend.dto;

public class UserDto {
    private String id;
    private String name;
    private String email;
    private String avatar;
    private String role;
    private String timezone;
    private boolean twoFactorEnabled;

    public UserDto() {}

    public UserDto(String id, String name, String email, String avatar, String role, String timezone, boolean twoFactorEnabled) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.avatar = avatar;
        this.role = role;
        this.timezone = timezone;
        this.twoFactorEnabled = twoFactorEnabled;
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

    public boolean isTwoFactorEnabled() {
        return twoFactorEnabled;
    }

    public void setTwoFactorEnabled(boolean twoFactorEnabled) {
        this.twoFactorEnabled = twoFactorEnabled;
    }
}
