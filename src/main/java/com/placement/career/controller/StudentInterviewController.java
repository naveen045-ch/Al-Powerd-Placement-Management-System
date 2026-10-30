package com.placement.career.controller;

import com.placement.career.dto.InterviewResponse;
import com.placement.career.service.InterviewService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/students/me/interviews")
public class StudentInterviewController {

    private final InterviewService interviewService;

    public StudentInterviewController(
            InterviewService interviewService
    ) {
        this.interviewService = interviewService;
    }

    @GetMapping
    @PreAuthorize("hasRole('STUDENT')")
    public List<InterviewResponse> getMyInterviews(
            Authentication authentication
    ) {
        return interviewService.getMyInterviews(
                authentication.getName()
        );
    }
}
