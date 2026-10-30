package com.placement.career.dto;

import com.placement.career.entity.AiInterviewStatus;

import java.time.LocalDateTime;

public record AiInterviewSessionResponse(
        Long id,
        String interviewType,
        String targetRole,
        Integer totalQuestions,
        Integer answeredQuestions,
        Double overallScore,
        String overallFeedback,
        AiInterviewStatus status,
        LocalDateTime startedAt,
        LocalDateTime completedAt
) {
}