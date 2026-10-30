package com.placement.career.dto;

import java.util.List;

public record JobRecommendationResponse(
        Long jobId,
        String jobTitle,
        String companyName,
        String location,
        String jobType,

        Double minimumCgpa,
        Integer graduationYear,

        List<String> matchedSkills,
        List<String> missingSkills,

        Integer totalRequiredSkills,
        Integer matchedSkillCount,
        Double skillMatchPercentage,

        boolean eligible
) {
}
