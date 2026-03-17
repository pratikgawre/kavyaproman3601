package com.team1.backend.config;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;

import java.util.Map;

@Configuration
public class CloudinaryConfig {

    private static final Logger log = LoggerFactory.getLogger(CloudinaryConfig.class);

    @Value("${cloudinary.url:}")
    private String cloudinaryUrl;

    @Value("${cloudinary.cloud-name:}")
    private String cloudName;

    @Value("${cloudinary.api-key:}")
    private String apiKey;

    @Value("${cloudinary.api-secret:}")
    private String apiSecret;

    @Value("${cloudinary.secure:true}")
    private boolean secure;

    @Bean
    public Cloudinary cloudinary() {
        if (StringUtils.hasText(cloudinaryUrl)) {
            return new Cloudinary(cloudinaryUrl);
        }

        if (StringUtils.hasText(cloudName) && StringUtils.hasText(apiKey) && StringUtils.hasText(apiSecret)) {
            Map<String, Object> config = ObjectUtils.asMap(
                    "cloud_name", cloudName,
                    "api_key", apiKey,
                    "api_secret", apiSecret,
                    "secure", secure
            );
            return new Cloudinary(config);
        }

        log.warn("Cloudinary is disabled. Set 'cloudinary.url' or 'cloudinary.cloud-name/api-key/api-secret' to enable uploads.");
        return new Cloudinary(ObjectUtils.asMap("secure", secure));
    }
}
