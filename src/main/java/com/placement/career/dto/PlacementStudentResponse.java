package com.placement.career.dto;

public record PlacementStudentResponse(
        Long studentId,
        String name,
        String email,
        String phone,
        String college,
        String branch,
        Integer graduationYear,
        Double cgpa
) {}
