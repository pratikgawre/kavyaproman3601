package com.team1.backend.config;

import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.util.StringUtils;

import java.util.Arrays;

@Configuration
public class ProductionMongoValidationConfig {

    @Bean
    public static BeanFactoryPostProcessor productionMongoConnectionValidation(Environment environment) {
        return beanFactory -> {
            if (!Arrays.asList(environment.getActiveProfiles()).contains("prod")) {
                return;
            }

            String uri = environment.getProperty("spring.mongodb.uri");
            String host = environment.getProperty("spring.mongodb.host");

            boolean hasUri = StringUtils.hasText(uri);
            boolean hasNonLocalHost = StringUtils.hasText(host)
                    && !"localhost".equalsIgnoreCase(host)
                    && !"127.0.0.1".equals(host);

            if (!hasUri && !hasNonLocalHost) {
                throw new IllegalStateException(
                        "MongoDB is not configured for the 'prod' profile. " +
                                "Set SPRING_MONGODB_URI (preferred) or SPRING_DATA_MONGODB_URI or MONGODB_URI (or MONGO_URL)."
                );
            }

            if (hasUri && (uri.contains("localhost") || uri.contains("127.0.0.1"))) {
                throw new IllegalStateException(
                        "MongoDB URI points to localhost for the 'prod' profile. " +
                                "Set SPRING_MONGODB_URI (preferred) or SPRING_DATA_MONGODB_URI or MONGODB_URI (or MONGO_URL) " +
                                "to a managed MongoDB instance (e.g., MongoDB Atlas)."
                );
            }
        };
    }
}
