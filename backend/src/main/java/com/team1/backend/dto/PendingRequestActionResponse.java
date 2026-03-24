package com.team1.backend.dto;

public class PendingRequestActionResponse {

    private String message;

    public PendingRequestActionResponse() {}

    public PendingRequestActionResponse(String message) {
        this.message = message;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
