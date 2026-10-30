package com.placement.career.controller;

import com.placement.career.dto.ApplicationTimelineResponse;
import com.placement.career.service.ApplicationTimelineService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/students/me/applications")
public class ApplicationTimelineController {

    private final ApplicationTimelineService applicationTimelineService;

    public ApplicationTimelineController(
            ApplicationTimelineService applicationTimelineService
    ) {
        this.applicationTimelineService = applicationTimelineService;
    }

    @GetMapping("/timeline")
    @PreAuthorize("hasRole('STUDENT')")
    public List<ApplicationTimelineResponse> getApplicationTimeline(
            Authentication authentication
    ) {
        return applicationTimelineService.getMyApplicationTimeline(
                authentication.getName()
        );
    }
}