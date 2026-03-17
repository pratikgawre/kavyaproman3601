package com.team1.backend.repository;

import com.team1.backend.model.Member;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface MemberRepository extends MongoRepository<Member, String> {
    Optional<Member> findByEmail(String email);
    Optional<Member> findByEmailAndManagerEmail(String email, String managerEmail);
}
