package com.placement.career.service;

import com.placement.career.dto.RecruiterDashboardResponse;
import com.placement.career.entity.ApplicationStatus;
import com.placement.career.entity.RecruiterProfile;
import com.placement.career.entity.User;
import com.placement.career.exception.ResourceNotFoundException;
import com.placement.career.repository.JobApplicationRepository;
import com.placement.career.repository.JobRepository;
import com.placement.career.repository.RecruiterProfileRepository;
import com.placement.career.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RecruiterDashboardService {

    private final UserRepository userRepository;
    private final RecruiterProfileRepository recruiterProfileRepository;
    private final JobRepository jobRepository;
    private final JobApplicationRepository applicationRepository;

    public RecruiterDashboardService(
            UserRepository userRepository,
            RecruiterProfileRepository recruiterProfileRepository,
            JobRepository jobRepository,
            JobApplicationRepository applicationRepository) {

        this.userRepository = userRepository;
        this.recruiterProfileRepository = recruiterProfileRepository;
        this.jobRepository = jobRepository;
        this.applicationRepository = applicationRepository;
    }

    @Transactional(readOnly = true)
    public RecruiterDashboardResponse getDashboard(String email) {

        User user = userRepository
                .findByEmailIgnoreCase(email)
                .orElseThrow(() ->
                        new ResourceNotFoundException("User not found"));

        RecruiterProfile recruiter =
                recruiterProfileRepository
                        .findByUserId(user.getId())
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Recruiter profile not found"));

        Long recruiterId = recruiter.getId();

        return new RecruiterDashboardResponse(
                jobRepository.countByRecruiterId(recruiterId),
                jobRepository.countByRecruiterIdAndActiveTrue(recruiterId),

                applicationRepository
                        .countByJobRecruiterId(recruiterId),

                count(recruiterId, ApplicationStatus.APPLIED),
                count(recruiterId, ApplicationStatus.UNDER_REVIEW),
                count(recruiterId, ApplicationStatus.SHORTLISTED),
                count(recruiterId, ApplicationStatus.INTERVIEW),
                count(recruiterId, ApplicationStatus.SELECTED),
                count(recruiterId, ApplicationStatus.REJECTED)
        );
    }

    private long count(
            Long recruiterId,
            ApplicationStatus status) {

        return applicationRepository
                .countByJobRecruiterIdAndStatus(
                        recruiterId,
                        status);
    }
}