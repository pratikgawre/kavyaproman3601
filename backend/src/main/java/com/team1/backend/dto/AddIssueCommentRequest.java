package com.team1.backend.dto;

import com.team1.backend.model.IssueAttachment;
import jakarta.validation.constraints.NotBlank;

import java.util.List;

public class AddIssueCommentRequest {

    @NotBlank
    private String message;
    private List<IssueAttachment> attachments;

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public List<IssueAttachment> getAttachments() {
        return attachments;
    }

    public void setAttachments(List<IssueAttachment> attachments) {
        this.attachments = attachments;
    }
}
