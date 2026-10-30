package com.placement.career.dto;

import java.time.LocalDateTime;

public record ResumeAnalysisHistoryDetail(
        Long id,
        String targetRole,
        Integer matchScore,
        String overallSummary,
        String roleFitSummary,
        String suggestedHeadline,
        LocalDateTime createdAt,
        ResumeAnalysisResponse analysis
) {
}