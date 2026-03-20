package com.team1.backend.config;

import com.team1.backend.model.Member;
import java.util.List;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.IndexField;
import org.springframework.data.mongodb.core.index.IndexInfo;
import org.springframework.data.mongodb.core.index.IndexOperations;
import org.springframework.stereotype.Component;

@Component
public class MemberIndexMigration implements ApplicationRunner {

    private final MongoTemplate mongoTemplate;

    public MemberIndexMigration(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        IndexOperations indexOps = mongoTemplate.indexOps(Member.class);
        List<IndexInfo> indexes = indexOps.getIndexInfo();
        for (IndexInfo index : indexes) {
            if (isLegacyEmailUniqueIndex(index)) {
                try {
                    indexOps.dropIndex(index.getName());
                } catch (Exception ex) {
                    // Avoid crashing startup if the index cannot be dropped.
                    System.err.println("Failed to drop legacy members.email index: " + ex.getMessage());
                }
            }
        }
    }

    private boolean isLegacyEmailUniqueIndex(IndexInfo index) {
        if (index == null || !index.isUnique()) {
            return false;
        }
        List<IndexField> fields = index.getIndexFields();
        if (fields == null || fields.isEmpty()) {
            return false;
        }
        boolean hasEmail = fields.stream().anyMatch(field -> "email".equals(field.getKey()));
        if (!hasEmail) {
            return false;
        }
        boolean hasManager = fields.stream().anyMatch(field -> "managerEmail".equals(field.getKey()));
        boolean hasOrgId = fields.stream().anyMatch(field -> "organizationId".equals(field.getKey()));
        return !(hasEmail && hasManager && hasOrgId);
    }
}
