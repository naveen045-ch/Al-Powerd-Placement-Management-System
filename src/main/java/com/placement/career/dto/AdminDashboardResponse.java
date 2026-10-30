package com.placement.career.dto;

public record AdminDashboardResponse(
        long totalUsers,
        long totalStudents,
        long totalRecruiters,
        long totalPlacementOfficers,
        long totalAdmins,
        long enabledUsers,
        long disabledUsers
) {}