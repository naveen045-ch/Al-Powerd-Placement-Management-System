package com.placement.career.dto;

import java.time.LocalDateTime;

public record JobBookmarkResponse(
        Long bookmarkId,
        Long jobId,
        String jobTitle,
        Long companyId,
        String companyName,
        String location,
        String jobType,
        Double minimumCgpa,
        Integer graduationYear,
        LocalDateTime applicationDeadline,
        LocalDateTime bookmarkedAt
) {
}