package com.placement.career.dto;

import com.placement.career.entity.RoleName;
import jakarta.validation.constraints.*;

public record AdminCreateUserRequest(

        @NotBlank
        @Size(max = 120)
        String fullName,

        @NotBlank
        @Email
        @Size(max = 180)
        String email,

        @Size(max = 30)
        String phone,

        @NotBlank
        @Size(min = 8, max = 64)
        String password,

        @NotNull
        RoleName role,

        // Student details
        @Size(max = 255)
        String college,

        @Size(max = 100)
        String branch,

        @Min(1)
        @Max(8)
        Integer semester,

        @DecimalMin("0.0")
        @DecimalMax("10.0")
        Double cgpa,

        @Min(2000)
        @Max(2100)
        Integer graduationYear,

        // Recruiter and company details
        @Size(max = 255)
        String companyName,

        @Size(max = 120)
        String industry,

        @Size(max = 255)
        String website,

        @Size(max = 255)
        String location,

        @Size(max = 120)
        String designation

) {
}