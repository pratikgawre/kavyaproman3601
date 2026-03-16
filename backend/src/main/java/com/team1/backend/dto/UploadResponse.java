package com.team1.backend.dto;

public class UploadResponse {
    private String url;
    private String publicId;
    private String resourceType;
    private String format;
    private String originalFilename;
    private long bytes;

    public UploadResponse() {}

    public UploadResponse(String url, String publicId, String resourceType, String format, String originalFilename, long bytes) {
        this.url = url;
        this.publicId = publicId;
        this.resourceType = resourceType;
        this.format = format;
        this.originalFilename = originalFilename;
        this.bytes = bytes;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public String getPublicId() {
        return publicId;
    }

    public void setPublicId(String publicId) {
        this.publicId = publicId;
    }

    public String getResourceType() {
        return resourceType;
    }

    public void setResourceType(String resourceType) {
        this.resourceType = resourceType;
    }

    public String getFormat() {
        return format;
    }

    public void setFormat(String format) {
        this.format = format;
    }

    public String getOriginalFilename() {
        return originalFilename;
    }

    public void setOriginalFilename(String originalFilename) {
        this.originalFilename = originalFilename;
    }

    public long getBytes() {
        return bytes;
    }

    public void setBytes(long bytes) {
        this.bytes = bytes;
    }
}
