package com.team1.backend.dto;

public class TwoFactorStatusResponse {
    private boolean enabled;
    private boolean pending;

    public TwoFactorStatusResponse() {}

    public TwoFactorStatusResponse(boolean enabled, boolean pending) {
        this.enabled = enabled;
        this.pending = pending;
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
}

