package com.team1.backend.repository;

import com.team1.backend.model.Member;
import java.util.List;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface MemberRepository extends MongoRepository<Member, String> {
    Optional<Member> findByEmail(String email);
    List<Member> findByEmailIgnoreCase(String email);
    Optional<Member> findByEmailAndManagerEmail(String email, String managerEmail);
    Optional<Member> findByEmailAndManagerEmailAndOrganizationId(String email, String managerEmail, String organizationId);
    Optional<Member> findByEmailAndManagerEmailAndOrganizationUsername(String email, String managerEmail, String organizationUsername);
    Optional<Member> findByEmailAndManagerEmailAndOrganizationNameIgnoreCase(String email, String managerEmail, String organizationName);
    List<Member> findByManagerEmail(String managerEmail);
    List<Member> findByManagerEmailIgnoreCase(String managerEmail);
    List<Member> findByOrganizationId(String organizationId);
    List<Member> findByOrganizationUsername(String organizationUsername);
    List<Member> findByOrganizationNameIgnoreCase(String organizationName);
    long countByOrganizationId(String organizationId);
    long countByOrganizationUsernameAndOrganizationIdIsNull(String organizationUsername);
    long countByOrganizationNameIgnoreCase(String organizationName);
    long countByManagerEmail(String managerEmail);
    long countByManagerEmailIgnoreCase(String managerEmail);
}
