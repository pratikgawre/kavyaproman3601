package com.team1.backend.service;

import com.cloudinary.Cloudinary;
import com.team1.backend.dto.UploadResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@Service
public class CloudinaryService {

    private final Cloudinary cloudinary;

    public CloudinaryService(Cloudinary cloudinary) {
        this.cloudinary = cloudinary;
    }

    public UploadResponse upload(MultipartFile file, String folder) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File is required");
        }

        Map<String, Object> options = new HashMap<>();
        options.put("resource_type", "auto");
        options.put("use_filename", true);
        options.put("unique_filename", true);
        options.put("overwrite", false);
        if (StringUtils.hasText(folder)) {
            options.put("folder", folder.trim());
        }

        Map<?, ?> result;
        try {
            result = cloudinary.uploader().upload(file.getBytes(), options);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Upload failed");
        }

        Object secureUrlObj = result.get("secure_url");
        String url = secureUrlObj instanceof String ? (String) secureUrlObj : (String) result.get("url");
        String publicId = (String) result.get("public_id");
        String resourceType = (String) result.get("resource_type");
        String format = (String) result.get("format");
        String originalFilename = (String) result.get("original_filename");
        long bytes = 0L;
        Object bytesObj = result.get("bytes");
        if (bytesObj instanceof Number) {
            bytes = ((Number) bytesObj).longValue();
        }

        return new UploadResponse(url, publicId, resourceType, format, originalFilename, bytes);
    }
}
