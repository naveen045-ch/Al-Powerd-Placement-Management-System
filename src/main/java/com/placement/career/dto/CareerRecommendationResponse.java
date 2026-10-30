package com.placement.career.dto;

import java.time.LocalDateTime;

public record CareerRecommendationResponse(
        Long id,
        String targetRole,
        String recommendedRoles,
        String strengths,
        String skillGaps,
        String recommendedTechnologies,
        String learningRoadmap,
        String placementAdvice,
        String overallAssessment,
        LocalDateTime generatedAt
) {
}