package com.placement.career.controller;

import com.placement.career.dto.StudentDashboardResponse;
import com.placement.career.service.StudentDashboardService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.placement.career.dto.JobRecommendationResponse;
import java.util.List;
import com.placement.career.service.JobRecommendationService;

@RestController
@RequestMapping("/api/students/me")
public class StudentDashboardController {

    private final StudentDashboardService studentDashboardService;

    private final JobRecommendationService jobRecommendationService;

    public StudentDashboardController(
            StudentDashboardService studentDashboardService,
            JobRecommendationService jobRecommendationService
    ) {
        this.studentDashboardService = studentDashboardService;
        this.jobRecommendationService = jobRecommendationService;
    }

    @GetMapping("/dashboard")
    @PreAuthorize("hasRole('STUDENT')")
    public StudentDashboardResponse getDashboard(
            Authentication authentication
    ) {
        return studentDashboardService.getDashboard(
                authentication.getName()
        );
    }
    @GetMapping("/recommendations")
    @PreAuthorize("hasRole('STUDENT')")
    public List<JobRecommendationResponse> getRecommendations(
            Authentication authentication
    ) {
        return jobRecommendationService.getRecommendations(
                authentication.getName()
        );
    }
}
