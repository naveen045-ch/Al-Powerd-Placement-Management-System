package com.placement.career.dto;

import jakarta.validation.constraints.Size;

public record CareerRecommendationRequest(

        @Size(max = 100, message = "Target role must not exceed 100 characters")
        String targetRole

) {
}