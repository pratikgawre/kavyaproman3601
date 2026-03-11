package com.team1.backend.dto;

public class VerifyOtpRequest {
    private String userId;
    private String code;

    public VerifyOtpRequest() {}

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }
}
