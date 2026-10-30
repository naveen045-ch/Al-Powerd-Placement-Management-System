package com.placement.career.dto;

import com.placement.career.entity.JobType;
import jakarta.validation.constraints.*;

import java.time.LocalDateTime;
import java.util.List;

public record JobCreateRequest(

        @NotBlank(message = "Job title is required")
        @Size(max = 150, message = "Job title must not exceed 150 characters")
        String title,

        @NotBlank(message = "Job description is required")
        @Size(max = 5000, message = "Job description must not exceed 5000 characters")
        String description,

        @NotBlank(message = "Location is required")
        @Size(max = 120, message = "Location must not exceed 120 characters")
        String location,

        @NotNull(message = "Job type is required")
        JobType jobType,

        @PositiveOrZero(message = "Minimum salary cannot be negative")
        Long salaryMin,

        @PositiveOrZero(message = "Maximum salary cannot be negative")
        Long salaryMax,

        @DecimalMin(value = "0.0", message = "Minimum CGPA cannot be negative")
        @DecimalMax(value = "10.0", message = "Minimum CGPA cannot exceed 10")
        Double minimumCgpa,

        @NotNull(message = "Graduation year is required")
        @Min(value = 2020, message = "Graduation year must be 2020 or later")
        @Max(value = 2100, message = "Invalid graduation year")
        Integer graduationYear,

        @NotNull(message = "Application deadline is required")
        @Future(message = "Application deadline must be in the future")
        LocalDateTime applicationDeadline,

        @NotEmpty(message = "At least one required skill must be selected")
        List<@NotNull(message = "Skill ID cannot be null")
        @Positive(message = "Skill ID must be positive") Long> requiredSkillIds
) {
}