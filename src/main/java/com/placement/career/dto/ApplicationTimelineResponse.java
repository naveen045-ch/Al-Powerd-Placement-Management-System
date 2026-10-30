package com.placement.career.dto;

import com.placement.career.entity.ApplicationStatus;

import java.time.LocalDateTime;

public record ApplicationTimelineResponse(
        Long applicationId,
        Long jobId,
        String jobTitle,
        String companyName,
        ApplicationStatus status,
        LocalDateTime appliedAt,
        LocalDateTime updatedAt,
        String recruiterNote
) {
}