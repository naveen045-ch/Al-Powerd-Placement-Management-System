package com.placement.career.dto;

import jakarta.validation.constraints.NotNull;

public record UserStatusRequest(
        @NotNull Boolean enabled
) {}
