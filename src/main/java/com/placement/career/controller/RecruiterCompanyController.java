package com.placement.career.controller;

import com.placement.career.dto.RecruiterCompanyRequest;
import com.placement.career.dto.RecruiterCompanyResponse;
import com.placement.career.service.RecruiterCompanyService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/recruiter/company")
@PreAuthorize("hasRole('RECRUITER')")
public class RecruiterCompanyController {

    private final RecruiterCompanyService recruiterCompanyService;

    public RecruiterCompanyController(
            RecruiterCompanyService recruiterCompanyService) {
        this.recruiterCompanyService = recruiterCompanyService;
    }

    @GetMapping
    public RecruiterCompanyResponse getMyCompany(
            Authentication authentication) {

        return recruiterCompanyService.getMyCompany(
                authentication.getName()
        );
    }

    @PutMapping
    public RecruiterCompanyResponse createOrUpdateCompany(
            Authentication authentication,
            @Valid @RequestBody RecruiterCompanyRequest request) {

        return recruiterCompanyService.createOrUpdateCompany(
                authentication.getName(),
                request
        );
    }
}