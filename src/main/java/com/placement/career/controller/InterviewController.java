package com.placement.career.controller;

import com.placement.career.dto.InterviewRequest;
import com.placement.career.dto.InterviewResponse;
import com.placement.career.service.InterviewService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/interviews")
public class InterviewController {

    private final InterviewService interviewService;

    public InterviewController(
            InterviewService interviewService
    ) {
        this.interviewService = interviewService;
    }

    @PostMapping("/applications/{applicationId}")
    @PreAuthorize("hasRole('RECRUITER')")
    public InterviewResponse scheduleInterview(
            Authentication authentication,
            @PathVariable Long applicationId,
            @Valid @RequestBody InterviewRequest request
    ) {

        return interviewService.scheduleInterview(
                authentication.getName(),
                applicationId,
                request
        );
    }

    @GetMapping("/applications/{applicationId}")
    @PreAuthorize("hasRole('RECRUITER')")
    public InterviewResponse getInterview(
            Authentication authentication,
            @PathVariable Long applicationId
    ) {

        return interviewService.getInterview(
                authentication.getName(),
                applicationId
        );
    }
}
