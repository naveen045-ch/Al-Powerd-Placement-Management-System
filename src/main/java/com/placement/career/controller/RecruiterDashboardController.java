package com.placement.career.controller;

import com.placement.career.dto.RecruiterDashboardResponse;
import com.placement.career.service.RecruiterDashboardService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/recruiter/dashboard")
@PreAuthorize("hasRole('RECRUITER')")
public class RecruiterDashboardController {

    private final RecruiterDashboardService recruiterDashboardService;

    public RecruiterDashboardController(
            RecruiterDashboardService recruiterDashboardService) {
        this.recruiterDashboardService = recruiterDashboardService;
    }

    @GetMapping
    public RecruiterDashboardResponse getDashboard(
            Authentication authentication) {

        return recruiterDashboardService.getDashboard(
                authentication.getName()
        );
    }
}