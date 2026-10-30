
package com.placement.career.repository;

import com.placement.career.entity.LoginOtpChallenge;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LoginOtpChallengeRepository
        extends JpaRepository<LoginOtpChallenge, String> {
    void deleteByEmailIgnoreCase(String email);
}
