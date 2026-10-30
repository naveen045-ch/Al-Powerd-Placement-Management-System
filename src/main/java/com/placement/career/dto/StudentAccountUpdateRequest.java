package com.placement.career.dto;

import jakarta.validation.constraints.Size;

public record StudentAccountUpdateRequest(

        @Size(max = 120)
        String fullName,

        @Size(max = 30)
        String phone
) {}