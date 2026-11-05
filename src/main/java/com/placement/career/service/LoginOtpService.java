
package com.placement.career.service;

import com.placement.career.dto.LoginOtpResponse;
import com.placement.career.entity.LoginOtpChallenge;
import com.placement.career.entity.LoginOtpRateLimit;
import com.placement.career.exception.OtpRateLimitException;
import com.placement.career.repository.LoginOtpChallengeRepository;
import com.placement.career.repository.LoginOtpRateLimitRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
public class LoginOtpService {

    private static final Logger log =
            LoggerFactory.getLogger(LoginOtpService.class);

    private final LoginOtpChallengeRepository repository;
    private final LoginOtpRateLimitRepository rateLimitRepository;
    private final PasswordEncoder passwordEncoder;

    private final RestClient restClient = RestClient.create();

    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${app.otp.expiry-minutes:5}")
    private long expiryMinutes;

    @Value("${app.otp.max-attempts:5}")
    private int maxAttempts;

    @Value("${RESEND_API_KEY:}")
    private String resendApiKey;

    @Value("${RESEND_FROM_EMAIL:onboarding@resend.dev}")
    private String fromEmail;

    public LoginOtpService(
            LoginOtpChallengeRepository repository,
            LoginOtpRateLimitRepository rateLimitRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.repository = repository;
        this.rateLimitRepository = rateLimitRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * Generate and send an OTP to the registered user's email.
     */
    @Transactional
    public LoginOtpResponse sendLoginOtp(String email) {

        if (email == null || email.trim().isEmpty()) {
            throw new IllegalArgumentException(
                    "Registered email is required."
            );
        }

        String recipientEmail = email.trim();

        String rateLimitKey =
                recipientEmail.toLowerCase(Locale.ROOT);

        checkAndRecordSend(rateLimitKey);

        // Invalidate previous OTP challenges.
        repository.deleteByEmailIgnoreCase(recipientEmail);

        String otp = String.format(
                "%06d",
                secureRandom.nextInt(1_000_000)
        );

        Instant now = Instant.now();

        LoginOtpChallenge challenge = new LoginOtpChallenge();

        challenge.setId(UUID.randomUUID().toString());
        challenge.setEmail(recipientEmail);
        challenge.setOtpHash(passwordEncoder.encode(otp));
        challenge.setCreatedAt(now);
        challenge.setExpiresAt(
                now.plusSeconds(expiryMinutes * 60)
        );

        repository.save(challenge);

        try {

            if (resendApiKey == null || resendApiKey.isBlank()) {
                throw new IllegalStateException(
                        "RESEND_API_KEY is not configured."
                );
            }

            String emailText =
                    "Your login OTP is: " + otp
                            + "\n\nThis OTP expires in "
                            + expiryMinutes
                            + " minutes."
                            + "\nDo not share this code with anyone.";

            Map<String, Object> requestBody = Map.of(
                    "from", fromEmail,
                    "to", List.of(recipientEmail),
                    "subject", "Your Placement System Login OTP",
                    "text", emailText
            );

            restClient.post()
                    .uri("https://api.resend.com/emails")
                    .contentType(MediaType.APPLICATION_JSON)
                    .header(
                            "Authorization",
                            "Bearer " + resendApiKey
                    )
                    .body(requestBody)
                    .retrieve()
                    .toBodilessEntity();

            log.info(
                    "Login OTP email successfully sent. Challenge ID: {}",
                    challenge.getId()
            );

        } catch (RuntimeException ex) {

            log.error(
                    "Failed to send login OTP email. Challenge ID: {}",
                    challenge.getId(),
                    ex
            );

            repository.deleteById(challenge.getId());

            throw new IllegalStateException(
                    "Unable to send login OTP email. "
                            + "Check Resend configuration.",
                    ex
            );
        }

        return new LoginOtpResponse(
                challenge.getId(),
                maskEmail(recipientEmail),
                expiryMinutes * 60,
                "OTP sent to your registered email."
        );
    }

    /**
     * Verify OTP.
     * Returns the verified email on success, otherwise null.
     */
    @Transactional
    public String verifyLoginOtp(
            String challengeId,
            String otp
    ) {

        LoginOtpChallenge challenge =
                repository.findById(challengeId).orElse(null);

        if (challenge == null) {
            return null;
        }

        Instant now = Instant.now();

        if (!now.isBefore(challenge.getExpiresAt())) {
            repository.delete(challenge);
            return null;
        }

        if (challenge.getAttempts() >= maxAttempts) {
            repository.delete(challenge);
            return null;
        }

        if (otp == null ||
                !passwordEncoder.matches(
                        otp,
                        challenge.getOtpHash()
                )) {

            challenge.setAttempts(
                    challenge.getAttempts() + 1
            );

            if (challenge.getAttempts() >= maxAttempts) {
                repository.delete(challenge);
            } else {
                repository.save(challenge);
            }

            return null;
        }

        String verifiedEmail = challenge.getEmail();

        // OTP challenge can only be used once.
        repository.delete(challenge);

        return verifiedEmail;
    }

    /**
     * Resend OTP to the email associated with the existing challenge.
     */
    @Transactional
    public LoginOtpResponse resendLoginOtp(String challengeId) {

        LoginOtpChallenge challenge =
                repository.findById(challengeId)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Invalid or expired login challenge."
                                )
                        );

        if (!Instant.now().isBefore(challenge.getExpiresAt())) {

            repository.delete(challenge);

            throw new IllegalArgumentException(
                    "Login challenge expired. Please log in again."
            );
        }

        // Uses the same registered recipient and rate limits.
        return sendLoginOtp(challenge.getEmail());
    }

    private void checkAndRecordSend(String normalizedEmail) {

        Instant now = Instant.now();

        LoginOtpRateLimit limit =
                rateLimitRepository.findById(normalizedEmail)
                        .orElse(null);

        // First OTP request for this email.
        if (limit == null) {

            limit = new LoginOtpRateLimit();
            limit.setEmail(normalizedEmail);
            limit.setWindowStartedAt(now);
            limit.setLastSentAt(now);
            limit.setSendCount(1);

            rateLimitRepository.saveAndFlush(limit);
            return;
        }

        // Reset the window after 15 minutes.
        if (!now.isBefore(
                limit.getWindowStartedAt()
                        .plusSeconds(15 * 60)
        )) {

            limit.setWindowStartedAt(now);
            limit.setLastSentAt(now);
            limit.setSendCount(1);

            rateLimitRepository.saveAndFlush(limit);
            return;
        }

        // At least 60 seconds between OTP sends.
        if (now.isBefore(
                limit.getLastSentAt().plusSeconds(60)
        )) {

            throw new OtpRateLimitException(
                    "Please wait 60 seconds before requesting another OTP."
            );
        }

        // Maximum three sends in the 15-minute window.
        if (limit.getSendCount() >= 3) {

            throw new OtpRateLimitException(
                    "OTP limit reached. Try again after 15 minutes."
            );
        }

        limit.setLastSentAt(now);
        limit.setSendCount(limit.getSendCount() + 1);

        rateLimitRepository.saveAndFlush(limit);
    }

    private String maskEmail(String email) {

        int at = email.indexOf('@');

        if (at <= 0 || at == email.length() - 1) {
            return "***";
        }

        String localPart = email.substring(0, at);

        String maskedLocalPart =
                localPart.length() <= 2
                        ? localPart.charAt(0) + "***"
                        : localPart.substring(0, 2) + "***";

        return maskedLocalPart + email.substring(at);
    }
}
