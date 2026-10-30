package com.placement.career.dto;

import com.placement.career.entity.InterviewMode;

import java.time.LocalDateTime;

public record InterviewResponse(
        Long interviewId,
        Long applicationId,
        Long jobId,
        String jobTitle,
        String studentName,
        String companyName,
        LocalDateTime interviewDateTime,
        InterviewMode mode,
        String locationOrLink,
        String notes
) {
}