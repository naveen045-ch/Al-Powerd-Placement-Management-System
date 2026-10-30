
package com.placement.career.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record VerifyLoginOtpRequest(
        @NotBlank(message = "Challenge ID is required")
        String challengeId,

        @NotBlank(message = "OTP is required")
        @Pattern(regexp = "^[0-9]{6}$",
                message = "OTP must be exactly 6 digits")
        String otp
) {
}
