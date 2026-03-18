package com.team1.backend.dto;

public class TwoFactorSetupResponse {
    private boolean enabled;
    private boolean pending;
    private String qrCodeDataUrl;
    private String secret;
    private String otpauthUri;

    public TwoFactorSetupResponse() {}

    public TwoFactorSetupResponse(boolean enabled, boolean pending, String qrCodeDataUrl, String secret, String otpauthUri) {
        this.enabled = enabled;
        this.pending = pending;
        this.qrCodeDataUrl = qrCodeDataUrl;
        this.secret = secret;
        this.otpauthUri = otpauthUri;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public boolean isPending() {
        return pending;
    }

    public void setPending(boolean pending) {
        this.pending = pending;
    }

    public String getQrCodeDataUrl() {
        return qrCodeDataUrl;
    }

    public void setQrCodeDataUrl(String qrCodeDataUrl) {
        this.qrCodeDataUrl = qrCodeDataUrl;
    }

    public String getSecret() {
        return secret;
    }

    public void setSecret(String secret) {
        this.secret = secret;
    }

    public String getOtpauthUri() {
        return otpauthUri;
    }

    public void setOtpauthUri(String otpauthUri) {
        this.otpauthUri = otpauthUri;
    }
}

