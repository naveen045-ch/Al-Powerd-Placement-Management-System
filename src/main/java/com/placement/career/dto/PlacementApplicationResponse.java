package com.placement.career.dto;

import com.placement.career.entity.ApplicationStatus;

import java.time.LocalDateTime;

public record PlacementApplicationResponse(
        Long applicationId,

        Long studentId,
        String studentName,
        String studentEmail,

        Long jobId,
        String jobTitle,

        Long companyId,
        String companyName,

        ApplicationStatus status,

        LocalDateTime appliedAt,
        LocalDateTime updatedAt,

        String recruiterNote
) {}