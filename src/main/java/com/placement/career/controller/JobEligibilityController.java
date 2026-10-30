package com.placement.career.controller;

import com.placement.career.dto.EligibilityResponse;
import com.placement.career.service.JobEligibilityService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/jobs")
public class JobEligibilityController {

    private final JobEligibilityService jobEligibilityService;

    public JobEligibilityController(
            JobEligibilityService jobEligibilityService
    ) {
        this.jobEligibilityService = jobEligibilityService;
    }

    @GetMapping("/{jobId}/eligibility")
    @PreAuthorize("hasRole('STUDENT')")
    public EligibilityResponse checkEligibility(
            Authentication authentication,
            @PathVariable Long jobId
    ) {

        return jobEligibilityService.checkEligibility(
                authentication.getName(),
                jobId
        );
    }
}
