
package com.placement.career.controller;

import com.placement.career.dto.InterviewRequest;
import com.placement.career.dto.InterviewResponse;
import com.placement.career.service.InterviewService;

import jakarta.validation.Valid;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/interviews")
public class InterviewController {

    private final InterviewService interviewService;

    public InterviewController(
            InterviewService interviewService
    ) {
        this.interviewService = interviewService;
    }

    // Recruiter: Schedule interview
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

    // Recruiter: Get interview for an application
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

    // Student: Get all my scheduled interviews
    @GetMapping("/me")
    @PreAuthorize("hasRole('STUDENT')")
    public List<InterviewResponse> getMyInterviews(
            Authentication authentication
    ) {
        return interviewService.getMyInterviews(
                authentication.getName()
        );
    }
}
