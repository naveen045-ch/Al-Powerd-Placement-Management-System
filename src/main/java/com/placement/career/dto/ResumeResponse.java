package com.placement.career.dto;

import java.time.LocalDateTime;

public record ResumeResponse(
        Long id,
        String originalFileName,
        String contentType,
        Long fileSize,
        LocalDateTime uploadedAt,
        LocalDateTime updatedAt
) {}