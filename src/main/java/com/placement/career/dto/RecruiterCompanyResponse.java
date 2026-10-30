package com.placement.career.dto;

public record RecruiterCompanyResponse(
        Long companyId,
        String companyName,
        String industry,
        String website,
        String location,
        String description,
        Long recruiterId,
        String recruiterName,
        String designation
) {}
