package com.placement.career.controller;

import com.placement.career.dto.JobCreateRequest;
import com.placement.career.dto.JobResponse;
import com.placement.career.service.ApplicationService;
import com.placement.career.service.JobService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import com.placement.career.dto.ApplicationResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.data.domain.Sort;
import org.springdoc.core.annotations.ParameterObject;
import com.placement.career.entity.JobType;

import java.util.List;

@RestController
@RequestMapping("/api/jobs")
public class JobController {

    private final JobService jobService;

    private final ApplicationService applicationService;

    public JobController(
            JobService jobService,
            ApplicationService applicationService) {

        this.jobService = jobService;
        this.applicationService = applicationService;
    }

    @PostMapping
    @PreAuthorize("hasRole('RECRUITER')")
    public ResponseEntity<JobResponse> createJob(
            Authentication authentication,
            @Valid @RequestBody JobCreateRequest request) {

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(
                        jobService.createJob(
                                authentication.getName(),
                                request)
                );
    }
    @GetMapping("/my")
    @PreAuthorize("hasRole('RECRUITER')")
    public Page<JobResponse> getMyJobs(
            Authentication authentication,
            @ParameterObject
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC)
            Pageable pageable) {

        return jobService.getMyJobs(authentication.getName(), pageable);
    }

    @GetMapping
    public Page<JobResponse> getAllJobs(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) JobType jobType,
            @RequestParam(required = false) Double minimumCgpa,
            @RequestParam(required = false) Integer graduationYear,
            @ParameterObject
            @PageableDefault(
                    size = 10,
                    sort = "createdAt",
                    direction = Sort.Direction.DESC
            )
            Pageable pageable) {

        return jobService.searchJobs(
                keyword,
                location,
                jobType,
                minimumCgpa,
                graduationYear,
                pageable);
    }

    @GetMapping("/{id}")
    public JobResponse getJob(
            @PathVariable Long id) {

        return jobService.getJob(id);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('RECRUITER')")
    public JobResponse updateJob(
            Authentication authentication,
            @PathVariable Long id,
            @Valid @RequestBody JobCreateRequest request) {

        return jobService.updateJob(
                authentication.getName(),
                id,
                request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('RECRUITER')")
    public ResponseEntity<Void> deleteJob(
            Authentication authentication,
            @PathVariable Long id) {

        jobService.deactivateJob(
                authentication.getName(),
                id);

        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{jobId}/apply")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApplicationResponse> applyForJob(
            Authentication authentication,
            @PathVariable Long jobId) {

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(
                        applicationService.applyForJob(
                                authentication.getName(),
                                jobId)
                );
    }
    @GetMapping("/{jobId}/applications")
    @PreAuthorize("hasRole('RECRUITER')")
    public Page<ApplicationResponse> getApplicants(
            Authentication authentication,
            @PathVariable Long jobId,
            @ParameterObject
            @PageableDefault(
                    size = 10,
                    sort = "appliedAt",
                    direction = Sort.Direction.DESC
            )
            Pageable pageable) {

        return applicationService.getJobApplicants(
                authentication.getName(),
                jobId,
                pageable);
    }

}
