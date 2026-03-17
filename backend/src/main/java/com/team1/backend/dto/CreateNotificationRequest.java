package com.team1.backend.dto;

import jakarta.validation.constraints.NotBlank;

public class CreateNotificationRequest {

    @NotBlank(message = "Title is required")
    private String title;

    private String type;

    private String href;

    public CreateNotificationRequest() {}

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getHref() {
        return href;
    }

    public void setHref(String href) {
        this.href = href;
    }
}

