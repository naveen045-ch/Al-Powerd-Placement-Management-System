package com.placement.career.dto;

import com.placement.career.entity.RoleName;

import java.time.LocalDateTime;
import java.util.Set;

public record AdminUserResponse(
        Long userId,
        String fullName,
        String email,
        String phone,
        boolean enabled,
        Set<RoleName> roles,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
