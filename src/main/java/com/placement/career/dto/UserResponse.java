package com.placement.career.dto;

import java.util.Set;

public record UserResponse(
        Long id,
        String fullName,
        String email,
        String phone,
        boolean enabled,
        Set<String> roles
) {}
