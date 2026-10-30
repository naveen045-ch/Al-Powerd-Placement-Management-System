package com.placement.career.dto;

import com.placement.career.entity.JobType;

import java.time.LocalDateTime;
import java.util.List;

public record JobResponse(

        Long id,
        Long companyId,
        String companyName,
        Long recruiterId,
        String title,
        String description,
        String location,
        JobType jobType,
        Long salaryMin,
        Long salaryMax,
        Double minimumCgpa,
        Integer graduationYear,
        LocalDateTime applicationDeadline,
        boolean active,
        List<SkillResponse> requiredSkills,
        LocalDateTime createdAt
) {
}
