package com.team1.backend.repository;

import com.team1.backend.model.User;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByEmail(String email);
    
    Optional<User> findByEmailIgnoreCase(String email);
    
    boolean existsByEmail(String email);

    @Query("{ $or: [ { name: { $regex: ?0, $options: 'i' } }, { email: { $regex: ?0, $options: 'i' } } ] }")
    List<User> searchByNameOrEmail(String regex, Pageable pageable);
}
