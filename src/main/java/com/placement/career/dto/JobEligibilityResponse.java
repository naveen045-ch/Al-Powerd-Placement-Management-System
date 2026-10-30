package com.placement.career.dto;

import java.util.List;

public record JobEligibilityResponse(
        boolean eligible,
        Long jobId,
        String jobTitle,
        List<String> reasons
) {
}