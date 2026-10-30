package com.placement.career.dto;

public record PlacementStatisticsResponse(
        long totalStudents,
        long totalCompanies,
        long totalJobs,
        long totalApplications,
        long totalApplied,
        long totalUnderReview,
        long totalShortlisted,
        long totalInterviews,
        long totalSelected,
        long totalRejected
) {}
