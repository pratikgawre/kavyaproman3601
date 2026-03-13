package com.team1.backend.service;

public record EmailAttachment(String fileName, String contentType, byte[] bytes) {}
