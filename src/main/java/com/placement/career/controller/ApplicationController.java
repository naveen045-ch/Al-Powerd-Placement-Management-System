package com.placement.career.controller;

import com.placement.career.dto.ApplicationResponse;
import com.placement.career.dto.ApplicationStatusRequest;
import com.placement.career.service.ApplicationService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springdoc.core.annotations.ParameterObject;

import java.util.List;

@RestController
@RequestMapping("/api/applications")
public class ApplicationController {

    private final ApplicationService applicationService;

    public ApplicationController(
            ApplicationService applicationService) {

        this.applicationService = applicationService;
    }

    // ============================
    // STUDENT
    // ============================

    @GetMapping("/me")
    @PreAuthorize("hasRole('STUDENT')")
    public Page<ApplicationResponse> getMyApplications(
            Authentication authentication,
            @ParameterObject
            @PageableDefault(
                    size = 10,
                    sort = "appliedAt",
                    direction = Sort.Direction.DESC
            )
            Pageable pageable) {

        return applicationService.getMyApplications(
                authentication.getName(),
                pageable);
    }

    // ============================
    // RECRUITER
    // ============================

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('RECRUITER')")
    public ApplicationResponse updateStatus(
            Authentication authentication,
            @PathVariable Long id,
            @Valid @RequestBody
            ApplicationStatusRequest request) {

        return applicationService.updateStatus(
                authentication.getName(),
                id,
                request);
    }
    @PatchMapping("/{id}/withdraw")
    @PreAuthorize("hasRole('STUDENT')")
    public ApplicationResponse withdrawApplication(
            Authentication authentication,
            @PathVariable Long id) {

        return applicationService.withdrawApplication(
                authentication.getName(),
                id);
    }
}
