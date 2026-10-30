package com.placement.career.dto;

public record StudentProfileResponse(
        Long studentId,
        Long userId,
        String fullName,
        String email,
        String phone,
        String college,
        String branch,
        Integer semester,
        Double cgpa,
        Integer graduationYear,
        String githubUrl,
        String linkedinUrl,
        String bio
) {}