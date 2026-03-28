package com.team1.backend.config;

import com.team1.backend.model.Member;
import com.team1.backend.model.User;
import java.util.List;
import java.util.stream.Collectors;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.index.PartialIndexFilter;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.stereotype.Component;

@Component
public class MongoIndexInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(MongoIndexInitializer.class);

    private final MongoTemplate mongoTemplate;
    private final boolean enabled;
    private final boolean autoDeduplicate;

    public MongoIndexInitializer(
            MongoTemplate mongoTemplate,
            @Value("${app.mongodb.indexes.enabled:true}") boolean enabled,
            @Value("${app.mongodb.indexes.auto-deduplicate:false}") boolean autoDeduplicate
    ) {
        this.mongoTemplate = mongoTemplate;
        this.enabled = enabled;
        this.autoDeduplicate = autoDeduplicate;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!enabled) {
            log.info("Mongo index initialization disabled (app.mongodb.indexes.enabled=false)");
            return;
        }
        ensureUniqueEmailIndex(User.class, true);
        ensureUniqueMemberScopeIndex();
    }

    private void ensureUniqueMemberScopeIndex() {
        Class<?> entityClass = Member.class;
        String collection = mongoTemplate.getCollectionName(entityClass);
        List<String> fields = List.of("email", "managerEmail", "organizationId");

        if (hasUniqueIndex(entityClass, fields)) {
            return;
        }

        Index index = new Index()
                .on("email", Sort.Direction.ASC)
                .on("managerEmail", Sort.Direction.ASC)
                .on("organizationId", Sort.Direction.ASC)
                .unique()
                .partial(PartialIndexFilter.of(new Criteria().andOperator(
                        Criteria.where("email").exists(true).ne(null),
                        Criteria.where("managerEmail").exists(true).ne(null),
                        Criteria.where("organizationId").exists(true).ne(null)
                )))
                .named("email_manager_org_unique");

        try {
            mongoTemplate.indexOps(entityClass).createIndex(index);
            log.info("Ensured unique index on {}.{}", collection, String.join("+", fields));
        } catch (DuplicateKeyException ex) {
            List<Document> duplicates = findDuplicateCombinations(collection, fields, 5);
            String sample = duplicates.stream()
                    .map(d -> formatCompoundDuplicate(d, fields))
                    .collect(Collectors.joining(", "));
            String msg = "Cannot create unique index on " + collection + "."
                    + String.join("+", fields)
                    + " because duplicate combinations exist."
                    + (sample.isBlank() ? "" : " Sample duplicates: " + sample)
                    + ". Deduplicate documents and restart.";
            log.warn(msg);
        } catch (Exception ex) {
            log.warn("Index creation failed for {}.{}.", collection, String.join("+", fields), ex);
        }
    }

    private void ensureUniqueEmailIndex(Class<?> entityClass, boolean required) {
        String collection = mongoTemplate.getCollectionName(entityClass);
        String field = "email";

        if (hasUniqueSingleFieldIndex(entityClass, field)) {
            return;
        }

        List<Document> duplicates = findDuplicateValues(collection, field, 5);
        if (!duplicates.isEmpty()) {
            if (autoDeduplicate) {
                int removed = deduplicateDocuments(collection, field);
                log.warn(
                        "Auto-deduplicated {} documents in {}. Set app.mongodb.indexes.auto-deduplicate=false to disable.",
                        removed,
                        collection
                );
                duplicates = findDuplicateValues(collection, field, 5);
            }

            if (duplicates.isEmpty()) {
                log.info("No remaining duplicate values in {}.{} after deduplication", collection, field);
            } else {
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
        }

        Index index = new Index()
                .on(field, Sort.Direction.ASC)
                .unique()
                .partial(PartialIndexFilter.of(Criteria.where(field).exists(true).ne(null)))
                .named(field + "_unique");

        try {
            mongoTemplate.indexOps(entityClass).createIndex(index);
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
        return hasUniqueIndex(entityClass, List.of(field));
    }

    private boolean hasUniqueIndex(Class<?> entityClass, List<String> fields) {
        return mongoTemplate.indexOps(entityClass).getIndexInfo().stream()
                .anyMatch(info -> info.isUnique()
                        && info.getIndexFields().size() == fields.size()
                        && fieldsMatch(info, fields));
    }

    private boolean fieldsMatch(org.springframework.data.mongodb.core.index.IndexInfo info, List<String> fields) {
        for (int i = 0; i < fields.size(); i++) {
            if (!fields.get(i).equals(info.getIndexFields().get(i).getKey())) {
                return false;
            }
        }
        return true;
    }

    private List<Document> findDuplicateValues(String collection, String field, int limit) {
        Aggregation aggregation = Aggregation.newAggregation(
                Aggregation.match(Criteria.where(field).exists(true).ne(null)),
                Aggregation.group(field).count().as("count"),
                Aggregation.match(Criteria.where("count").gt(1)),
                Aggregation.sort(Sort.by(Sort.Direction.DESC, "count")),
                Aggregation.limit(limit)
        );

        return mongoTemplate.aggregate(aggregation, collection, Document.class).getMappedResults();
    }

    private List<Document> findDuplicateCombinations(String collection, List<String> fields, int limit) {
        Criteria[] requiredFieldCriteria = fields.stream()
                .map(field -> Criteria.where(field).exists(true).ne(null))
                .toArray(Criteria[]::new);

        Aggregation aggregation = Aggregation.newAggregation(
                Aggregation.match(new Criteria().andOperator(requiredFieldCriteria)),
                Aggregation.group(fields.toArray(String[]::new)).count().as("count"),
                Aggregation.match(Criteria.where("count").gt(1)),
                Aggregation.sort(Sort.by(Sort.Direction.DESC, "count")),
                Aggregation.limit(limit)
        );

        return mongoTemplate.aggregate(aggregation, collection, Document.class).getMappedResults();
    }

    private String formatCompoundDuplicate(Document duplicate, List<String> fields) {
        Object id = duplicate.get("_id");
        Object count = duplicate.get("count");

        if (id instanceof Document keyDoc) {
            String keys = fields.stream()
                    .map(field -> field + "=" + keyDoc.get(field))
                    .collect(Collectors.joining(", "));
            return keys + " (" + count + ")";
        }

        return String.valueOf(id) + " (" + count + ")";
    }

    private int deduplicateDocuments(String collection, String field) {
        int totalRemoved = 0;

        Aggregation aggregation = Aggregation.newAggregation(
                Aggregation.match(Criteria.where(field).exists(true).ne(null)),
                Aggregation.group(field).push("_id").as("ids"),
                // "ids.1" exists => at least 2 elements in the grouped array
                Aggregation.match(Criteria.where("ids.1").exists(true))
        );

        List<Document> duplicateGroups = mongoTemplate.aggregate(aggregation, collection, Document.class).getMappedResults();

        for (Document group : duplicateGroups) {
            Object value = group.get("_id");
            List<Object> ids = group.getList("ids", Object.class);

            if (ids == null || ids.size() < 2) {
                continue;
            }

            ids.sort(MongoIndexInitializer::compareIds);
            List<Object> idsToDelete = ids.subList(1, ids.size());

            Query deleteQuery = Query.query(Criteria.where("_id").in(idsToDelete));
            mongoTemplate.remove(deleteQuery, collection);
            totalRemoved += idsToDelete.size();

            log.debug("Removed {} duplicate documents from {} where {}={}", idsToDelete.size(), collection, field, value);
        }

        return totalRemoved;
    }

    private static int compareIds(Object left, Object right) {
        if (left instanceof ObjectId leftObjectId && right instanceof ObjectId rightObjectId) {
            return leftObjectId.compareTo(rightObjectId);
        }
        if (left instanceof String leftString && right instanceof String rightString) {
            return leftString.compareTo(rightString);
        }
        return String.valueOf(left).compareTo(String.valueOf(right));
    }
}
