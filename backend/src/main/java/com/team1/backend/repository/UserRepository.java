package com.team1.backend.repository;

import com.team1.backend.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByEmail(String email);
    
    Optional<User> findByEmailIgnoreCase(String email);
    
    boolean existsByEmail(String email);
}
