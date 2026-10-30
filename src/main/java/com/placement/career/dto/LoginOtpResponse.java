
package com.placement.career.dto;

public record LoginOtpResponse(
        String challengeId,
        String maskedEmail,
        long expiresInSeconds,
        String message
) {
}
