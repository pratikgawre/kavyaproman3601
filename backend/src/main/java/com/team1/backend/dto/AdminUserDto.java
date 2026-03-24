package com.team1.backend.dto;

public class AdminUserDto {

    private String id;
    private String name;
    private String email;
    private String role;
    private boolean verified;

    public AdminUserDto() {
    }

    public AdminUserDto(String id, String name, String email, String role, boolean verified) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.role = role;
        this.verified = verified;
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

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public boolean isVerified() {
        return verified;
    }

    public void setVerified(boolean verified) {
        this.verified = verified;
    }
}
