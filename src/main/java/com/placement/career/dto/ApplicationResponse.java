package com.placement.career.dto;

import com.placement.career.entity.ApplicationStatus;

import java.time.LocalDateTime;

public record ApplicationResponse(

        Long id,

        Long jobId,
        String jobTitle,

        Long companyId,
        String companyName,

        Long studentId,
        String studentName,
        String studentEmail,

        ApplicationStatus status,

        LocalDateTime appliedAt,
        LocalDateTime updatedAt,

        String recruiterNote
) {
}
