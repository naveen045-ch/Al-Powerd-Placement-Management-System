package com.placement.career.dto;

public record RecruiterDashboardResponse(
        long totalJobs,
        long activeJobs,
        long totalApplications,
        long totalApplied,
        long totalUnderReview,
        long totalShortlisted,
        long totalInterviews,
        long totalSelected,
        long totalRejected
) {}