
package com.placement.career.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "login_otp_rate_limits")
public class LoginOtpRateLimit {

    @Id
    @Column(nullable = false, length = 254)
    private String email;

    @Column(nullable = false)
    private Instant windowStartedAt;

    @Column(nullable = false)
    private Instant lastSentAt;

    @Column(nullable = false)
    private int sendCount;

    public LoginOtpRateLimit() {
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public Instant getWindowStartedAt() {
        return windowStartedAt;
    }

    public void setWindowStartedAt(Instant windowStartedAt) {
        this.windowStartedAt = windowStartedAt;
    }

    public Instant getLastSentAt() {
        return lastSentAt;
    }

    public void setLastSentAt(Instant lastSentAt) {
        this.lastSentAt = lastSentAt;
    }

    public int getSendCount() {
        return sendCount;
    }

    public void setSendCount(int sendCount) {
        this.sendCount = sendCount;
    }
}
