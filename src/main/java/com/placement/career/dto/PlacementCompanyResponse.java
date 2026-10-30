package com.placement.career.dto;

public record PlacementCompanyResponse(
        Long companyId,
        String companyName,
        String industry,
        String website,
        String location
) {}