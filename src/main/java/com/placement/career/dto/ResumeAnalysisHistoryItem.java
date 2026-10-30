package com.placement.career.dto;

import java.time.LocalDateTime;

public record ResumeAnalysisHistoryItem(
        Long id,
        String targetRole,
        Integer matchScore,
        String overallSummary,
        LocalDateTime createdAt
) {
}