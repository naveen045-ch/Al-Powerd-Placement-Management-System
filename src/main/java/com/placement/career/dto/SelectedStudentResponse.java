package com.placement.career.dto;

public record SelectedStudentResponse(
        Long applicationId,
        Long studentId,
        String studentName,
        String studentEmail,
        Long jobId,
        String jobTitle,
        Long companyId,
        String companyName
) {}