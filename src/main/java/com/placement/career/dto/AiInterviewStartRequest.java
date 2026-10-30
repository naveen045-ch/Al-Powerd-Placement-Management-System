package com.placement.career.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AiInterviewStartRequest(

        @NotBlank
        @Size(max = 100)
        String interviewType,

        @Size(max = 100)
        String targetRole,

        Integer totalQuestions
) {
}