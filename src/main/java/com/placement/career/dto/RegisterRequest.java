package com.placement.career.dto;

import com.placement.career.entity.RoleName;
import jakarta.validation.constraints.*;

public record RegisterRequest(
        @NotBlank @Size(max = 120) String fullName,
        @NotBlank @Email @Size(max = 180) String email,
        @NotBlank @Size(min = 8, max = 100) String password,
        @Size(max = 30) String phone,
        @NotNull RoleName role
) {}
