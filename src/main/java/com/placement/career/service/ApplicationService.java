package com.placement.career.service;

import com.placement.career.dto.ApplicationResponse;
import com.placement.career.dto.ApplicationStatusRequest;
import com.placement.career.entity.*;
import com.placement.career.exception.ResourceNotFoundException;
import com.placement.career.repository.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.time.LocalDateTime;
import java.util.List;

import java.time.LocalDateTime;

@Service
public class ApplicationService {

    private final JobRepository jobRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final JobApplicationRepository applicationRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    public ApplicationService(
            JobRepository jobRepository,
            StudentProfileRepository studentProfileRepository,
            JobApplicationRepository applicationRepository,
            UserRepository userRepository,
            NotificationService notificationService) {

        this.jobRepository = jobRepository;
        this.studentProfileRepository = studentProfileRepository;
        this.applicationRepository = applicationRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
    }

    // ============================
    // STUDENT APPLY
    // ============================

    @Transactional
    public ApplicationResponse applyForJob(
            String email,
            Long jobId) {

        Job job = jobRepository
                .findById(jobId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Job not found"));

        // Check job is active
        if (!job.isActive()) {

            throw new IllegalArgumentException(
                    "This job is no longer active");
        }

        // Check deadline
        if (job.getApplicationDeadline()
                .isBefore(LocalDateTime.now())) {

            throw new IllegalArgumentException(
                    "Application deadline has passed");
        }

        // Find student user
        User user = userRepository
                .findByEmailIgnoreCase(email)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "User not found"));

        // Find student profile
        StudentProfile student =
                studentProfileRepository
                        .findByUserId(user.getId())
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Student profile not found"));

        // Prevent duplicate application
        if (applicationRepository
                .existsByJobIdAndStudentId(
                        jobId,
                        student.getId())) {

            throw new IllegalArgumentException(
                    "You have already applied for this job");
        }

        // ============================
        // ELIGIBILITY CHECK
        // ============================

        // CGPA check
        if (job.getMinimumCgpa() != null) {

            if (student.getCgpa() == null ||
                    student.getCgpa()
                            < job.getMinimumCgpa()) {

                throw new IllegalArgumentException(
                        "Student does not meet the minimum CGPA requirement");
            }
        }

        // Graduation year check
        if (job.getGraduationYear() != null) {

            if (student.getGraduationYear() == null ||
                    !student.getGraduationYear()
                            .equals(job.getGraduationYear())) {

                throw new IllegalArgumentException(
                        "Student does not meet the graduation year requirement");
            }
        }

        // ============================
        // CREATE APPLICATION
        // ============================

        JobApplication application =
                new JobApplication();

        application.setJob(job);
        application.setStudent(student);

        application.setStatus(
                ApplicationStatus.APPLIED);

        JobApplication saved =
                applicationRepository.save(application);

        notificationService.createNotification(
                job.getRecruiter().getUser().getId(),
                "New Job Application",
                "A student has applied for your job: "
                        + job.getTitle()
        );

        return convertToResponse(saved);
    }

    // ============================
    // STUDENT APPLICATIONS
    // ============================

    @Transactional(readOnly = true)
    public Page<ApplicationResponse> getMyApplications(
            String email,
            Pageable pageable) {

        User user = userRepository
                .findByEmailIgnoreCase(email)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "User not found"));

        StudentProfile student =
                studentProfileRepository
                        .findByUserId(user.getId())
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Student profile not found"));

        return applicationRepository
                .findByStudentId(student.getId(), pageable)
                .map(this::convertToResponse);
    }

    // ============================
    // RECRUITER VIEW APPLICANTS
    // ============================

    @Transactional(readOnly = true)
    public Page<ApplicationResponse> getJobApplicants(
            String email,
            Long jobId,
            Pageable pageable) {

        Job job = jobRepository
                .findById(jobId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Job not found"));

        checkJobOwner(job, email);

        return applicationRepository
                .findByJobId(jobId, pageable)
                .map(this::convertToResponse);
    }

    // ============================
    // RECRUITER UPDATE STATUS
    // ============================

    @Transactional
    public ApplicationResponse updateStatus(
            String email,
            Long applicationId,
            ApplicationStatusRequest request) {

        JobApplication application =
                applicationRepository
                        .findById(applicationId)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Application not found"));

        Job job = application.getJob();

        checkJobOwner(job, email);

        // Recruiter cannot change it back to APPLIED
        if (request.status() ==
                ApplicationStatus.APPLIED) {

            throw new IllegalArgumentException(
                    "Application cannot be moved back to APPLIED");
        }

        // SELECTED or REJECTED can only be decided after interview
        if ((request.status() == ApplicationStatus.SELECTED
                || request.status() == ApplicationStatus.REJECTED)
                && application.getStatus() != ApplicationStatus.INTERVIEW) {

            throw new IllegalArgumentException(
                    "Application must be in INTERVIEW status before it can be SELECTED or REJECTED");
        }

        // Once selected or rejected, don't allow further status changes
        if (application.getStatus() == ApplicationStatus.SELECTED
                || application.getStatus() == ApplicationStatus.REJECTED) {

            throw new IllegalArgumentException(
                    "Final application status cannot be changed");
        }

        application.setStatus(
                request.status());

        application.setRecruiterNote(
                request.recruiterNote());

        JobApplication updated =
                applicationRepository.save(application);

        String notificationTitle = "Application Status Updated";
        String notificationMessage =
                "Your application for "
                        + job.getTitle()
                        + " has been updated to "
                        + request.status();

        if (request.status() == ApplicationStatus.SELECTED) {

            notificationTitle = "Congratulations! You are Selected";
            notificationMessage =
                    "Congratulations! You have been selected for the job: "
                            + job.getTitle();

        } else if (request.status() == ApplicationStatus.REJECTED) {

            notificationTitle = "Application Rejected";
            notificationMessage =
                    "Your application for "
                            + job.getTitle()
                            + " has been rejected.";
        }

        notificationService.createNotification(
                application.getStudent().getUser().getId(),
                notificationTitle,
                notificationMessage
        );

        return convertToResponse(updated);
    }

    // ============================
    // OWNER CHECK
    // ============================

    private void checkJobOwner(
            Job job,
            String email) {

        if (!job.getRecruiter()
                .getUser()
                .getEmail()
                .equalsIgnoreCase(email)) {

            throw new AccessDeniedException(
                    "You are not allowed to manage this job");
        }
    }

    // ============================
    // ENTITY → DTO
    // ============================

    private ApplicationResponse convertToResponse(
            JobApplication application) {

        return new ApplicationResponse(

                application.getId(),

                application.getJob().getId(),
                application.getJob().getTitle(),

                application.getJob()
                        .getCompany()
                        .getId(),

                application.getJob()
                        .getCompany()
                        .getName(),

                application.getStudent().getId(),

                application.getStudent()
                        .getUser()
                        .getFullName(),

                application.getStudent()
                        .getUser()
                        .getEmail(),

                application.getStatus(),

                application.getAppliedAt(),

                application.getUpdatedAt(),

                application.getRecruiterNote()
        );
    }
    public long countRecruiterApplications(Long recruiterId) {
        return applicationRepository.countByJobRecruiterId(recruiterId);
    }

    public long countRecruiterApplicationsByStatus(
            Long recruiterId,
            ApplicationStatus status) {

        return applicationRepository
                .countByJobRecruiterIdAndStatus(
                        recruiterId,
                        status);
    }
    @Transactional
    public ApplicationResponse withdrawApplication(
            String email,
            Long applicationId) {

        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() ->
                        new ResourceNotFoundException("User not found"));

        StudentProfile student = studentProfileRepository
                .findByUserId(user.getId())
                .orElseThrow(() ->
                        new ResourceNotFoundException("Student profile not found"));

        JobApplication application = applicationRepository
                .findById(applicationId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Application not found"));

        // Verify that this application belongs to the logged-in student
        if (!application.getStudent().getId().equals(student.getId())) {
            throw new AccessDeniedException(
                    "You can only withdraw your own application");
        }

        ApplicationStatus currentStatus = application.getStatus();

        if (currentStatus == ApplicationStatus.SELECTED) {
            throw new IllegalArgumentException(
                    "Selected applications cannot be withdrawn");
        }

        if (currentStatus == ApplicationStatus.REJECTED) {
            throw new IllegalArgumentException(
                    "Rejected applications cannot be withdrawn");
        }

        if (currentStatus == ApplicationStatus.WITHDRAWN) {
            throw new IllegalArgumentException(
                    "Application is already withdrawn");
        }

        application.setStatus(ApplicationStatus.WITHDRAWN);


        JobApplication saved = applicationRepository.save(application);

        return convertToResponse(saved);
    }
}
