package com.team1.backend.dto;

import java.time.LocalDateTime;

public class NotificationDto {

    private String id;
    private String title;
    private String type;
    private String href;
    private boolean read;
    private LocalDateTime createdAt;

    public NotificationDto() {}

    public NotificationDto(String id, String title, String type, String href, boolean read, LocalDateTime createdAt) {
        this.id = id;
        this.title = title;
        this.type = type;
        this.href = href;
        this.read = read;
        this.createdAt = createdAt;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

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

    public boolean isRead() {
        return read;
    }

    public void setRead(boolean read) {
        this.read = read;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}

