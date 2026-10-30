package com.placement.career.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RecruiterCompanyRequest(

        @NotBlank
        @Size(max = 150)
        String name,

        @Size(max = 100)
        String industry,

        @Size(max = 300)
        String website,

        @Size(max = 150)
        String location,

        @Size(max = 1000)
        String description

) {}