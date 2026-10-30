package com.placement.career.controller;

import com.placement.career.dto.RecruiterCandidateResponse;
import com.placement.career.entity.ApplicationStatus;
import com.placement.career.service.RecruiterCandidateService;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/recruiter/candidates")
@PreAuthorize("hasRole('RECRUITER')")
public class RecruiterCandidateController {

    private final RecruiterCandidateService candidateService;

    public RecruiterCandidateController(
            RecruiterCandidateService candidateService) {

        this.candidateService = candidateService;
    }

    @GetMapping
    public Page<RecruiterCandidateResponse> searchCandidates(
            Authentication authentication,

            @RequestParam(required = false)
            String keyword,

            @RequestParam(required = false)
            Double minimumCgpa,

            @RequestParam(required = false)
            Integer graduationYear,

            @RequestParam(required = false)
            ApplicationStatus status,

            @RequestParam(required = false)
            Long jobId,

            @ParameterObject
            @PageableDefault(
                    size = 10,
                    sort = "appliedAt",
                    direction = Sort.Direction.DESC
            )
            Pageable pageable) {

        return candidateService.searchCandidates(
                authentication.getName(),
                keyword,
                minimumCgpa,
                graduationYear,
                status,
                jobId,
                pageable
        );
    }
}