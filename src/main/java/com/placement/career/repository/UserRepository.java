package com.placement.career.repository;

import com.placement.career.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import com.placement.career.entity.RoleName;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmailIgnoreCase(String email);
    boolean existsByEmailIgnoreCase(String email);
    List<User> findDistinctByRolesName(RoleName roleName);
}
