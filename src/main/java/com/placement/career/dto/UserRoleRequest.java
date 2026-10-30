package com.placement.career.dto;

import com.placement.career.entity.RoleName;
import jakarta.validation.constraints.NotNull;

public record UserRoleRequest(
        @NotNull RoleName role
) {}
