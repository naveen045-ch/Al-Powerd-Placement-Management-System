package com.placement.career.dto;

import java.time.LocalDateTime;

public record PlacementJobResponse(
        Long jobId,
        String jobTitle,
        String companyName,
        String location,
        String jobType,
        Long salaryMin,
        Long salaryMax,
        Double minimumCgpa,
        Integer graduationYear,
        LocalDateTime applicationDeadline,
        boolean active,
        LocalDateTime createdAt
) {}