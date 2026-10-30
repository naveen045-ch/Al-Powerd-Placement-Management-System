package com.placement.career.dto;

import java.util.List;

public record EligibilityResponse(
        Long jobId,
        String jobTitle,

        boolean cgpaEligible,
        boolean graduationYearEligible,
        boolean skillEligible,
        boolean jobActive,
        boolean deadlinePassed,
        boolean alreadyApplied,
        boolean eligible,

        Double studentCgpa,
        Double requiredCgpa,

        Integer studentGraduationYear,
        Integer requiredGraduationYear,

        List<String> matchedSkills,
        List<String> missingSkills,

        Integer totalRequiredSkills,
        Integer matchedSkillCount,
        Double skillMatchPercentage,

        List<String> eligibilityReasons
) {
}