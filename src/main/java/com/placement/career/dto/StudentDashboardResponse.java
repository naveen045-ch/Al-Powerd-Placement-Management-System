package com.placement.career.dto;

import com.placement.career.entity.ApplicationStatus;

import java.util.Map;

public record StudentDashboardResponse(
        Long studentId,
        String studentName,
        String email,
        Integer totalSkills,
        Integer totalApplications,
        Map<ApplicationStatus, Long> applicationsByStatus
) {
}