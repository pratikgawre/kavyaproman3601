package com.team1.backend.config;

import com.team1.backend.model.Member;
import com.team1.backend.model.User;
import java.util.List;
import java.util.stream.Collectors;
import org.bson.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.stereotype.Component;

@Component
public class MongoIndexInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(MongoIndexInitializer.class);

    private final MongoTemplate mongoTemplate;
    private final boolean enabled;

    public MongoIndexInitializer(
            MongoTemplate mongoTemplate,
            @Value("${app.mongodb.indexes.enabled:true}") boolean enabled
    ) {
        this.mongoTemplate = mongoTemplate;
        this.enabled = enabled;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!enabled) {
            log.info("Mongo index initialization disabled (app.mongodb.indexes.enabled=false)");
            return;
        }
        ensureUniqueEmailIndex(User.class, true);
        ensureUniqueEmailIndex(Member.class, false);
    }

    private void ensureUniqueEmailIndex(Class<?> entityClass, boolean required) {
        String collection = mongoTemplate.getCollectionName(entityClass);
        String field = "email";

        if (hasUniqueSingleFieldIndex(entityClass, field)) {
            return;
        }

        List<Document> duplicates = findDuplicateValues(collection, field, 5);
        if (!duplicates.isEmpty()) {
            String sample = duplicates.stream()
                    .map(d -> String.valueOf(d.get("_id")) + " (" + d.get("count") + ")")
                    .collect(Collectors.joining(", "));

            String msg = "Cannot create unique index on " + collection + "." + field
                    + " because duplicate values exist. Sample duplicates: " + sample
                    + ". Deduplicate documents and restart.";

            if (required) {
                throw new IllegalStateException(msg);
            }

            log.warn(msg);
            return;
        }

        Index index = new Index()
                .on(field, Sort.Direction.ASC)
                .unique()
                .named(field + "_unique");

        try {
            mongoTemplate.indexOps(entityClass).ensureIndex(index);
            log.info("Ensured unique index on {}.{}", collection, field);
        } catch (DuplicateKeyException ex) {
            String msg = "Unique index creation failed for " + collection + "." + field + " due to duplicates. "
                    + "Deduplicate documents and restart.";
            if (required) {
                throw new IllegalStateException(msg, ex);
            }
            log.warn(msg, ex);
        } catch (Exception ex) {
            String msg = "Index creation failed for " + collection + "." + field + ".";
            if (required) {
                throw new IllegalStateException(msg, ex);
            }
            log.warn(msg, ex);
        }
    }

    private boolean hasUniqueSingleFieldIndex(Class<?> entityClass, String field) {
        return mongoTemplate.indexOps(entityClass).getIndexInfo().stream()
                .anyMatch(info -> info.isUnique()
                        && info.getIndexFields().size() == 1
                        && field.equals(info.getIndexFields().get(0).getKey()));
    }

    private List<Document> findDuplicateValues(String collection, String field, int limit) {
        Aggregation aggregation = Aggregation.newAggregation(
                Aggregation.group(field).count().as("count"),
                Aggregation.match(Criteria.where("count").gt(1)),
                Aggregation.sort(Sort.by(Sort.Direction.DESC, "count")),
                Aggregation.limit(limit)
        );

        return mongoTemplate.aggregate(aggregation, collection, Document.class).getMappedResults();
    }
}
