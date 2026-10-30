package com.placement.career.dto;

import com.placement.career.entity.ApplicationStatus;

import java.time.LocalDateTime;
import java.util.List;

public record RecruiterCandidateResponse(

        Long applicationId,

        Long studentId,
        String studentName,
        String studentEmail,

        Double cgpa,
        Integer graduationYear,

        List<String> skills,

        Long jobId,
        String jobTitle,

        ApplicationStatus applicationStatus,

        LocalDateTime appliedAt,
        LocalDateTime updatedAt,

        String recruiterNote
) {
}