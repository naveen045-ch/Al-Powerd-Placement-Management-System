
package com.placement.career.dto;

import jakarta.validation.constraints.*;

public record ProfileUpdateRequest(

        @Size(max = 120)
        String fullName,

        @Size(max = 30)
        String phone,

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

        @Size(max = 255)
        String githubUrl,

        @Size(max = 255)
        String linkedinUrl,

        @Size(max = 1000)
        String bio,

        @Size(max = 120)
        String designation

) {
}
