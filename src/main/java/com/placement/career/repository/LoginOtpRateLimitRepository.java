
package com.placement.career.repository;

import com.placement.career.entity.LoginOtpRateLimit;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LoginOtpRateLimitRepository
        extends JpaRepository<LoginOtpRateLimit, String> {
}
