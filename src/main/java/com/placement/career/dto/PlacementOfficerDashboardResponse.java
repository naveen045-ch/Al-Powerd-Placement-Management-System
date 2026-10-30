package com.placement.career.dto;

public record PlacementOfficerDashboardResponse(

        Long totalStudents,

        Long totalCompanies,

        Long totalJobs,

        Long totalApplications,

        Long totalSelected,

        Long totalRejected,

        Long totalInterviews

) {
}