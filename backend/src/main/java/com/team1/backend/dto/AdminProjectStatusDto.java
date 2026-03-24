package com.team1.backend.dto;

public class AdminProjectStatusDto {

    private String label;
    private long count;
    private String ownerName;
    private String ownerEmail;

    public AdminProjectStatusDto() {
    }

    public AdminProjectStatusDto(String label, long count, String ownerName, String ownerEmail) {
        this.label = label;
        this.count = count;
        this.ownerName = ownerName;
        this.ownerEmail = ownerEmail;
    }

    public String getLabel() {
        return label;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public long getCount() {
        return count;
    }

    public void setCount(long count) {
        this.count = count;
    }

    public String getOwnerName() {
        return ownerName;
    }

    public void setOwnerName(String ownerName) {
        this.ownerName = ownerName;
    }

    public String getOwnerEmail() {
        return ownerEmail;
    }

    public void setOwnerEmail(String ownerEmail) {
        this.ownerEmail = ownerEmail;
    }
}
