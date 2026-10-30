package com.placement.career.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public record StudentProfileUpdateRequest(

        @Size(max = 150)
        String college,

        @Size(max = 100)
        String branch,

        @Min(1)
        @Max(12)
        Integer semester,

        @DecimalMin("0.0")
        @DecimalMax("10.0")
        Double cgpa,

        @Min(2000)
        @Max(2100)
        Integer graduationYear,

        @Size(max = 300)
        String githubUrl,

        @Size(max = 300)
        String linkedinUrl,

        @Size(max = 1000)
        String bio
) {}