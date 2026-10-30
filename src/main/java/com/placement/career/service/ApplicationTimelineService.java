package com.placement.career.service;

import com.placement.career.dto.ApplicationTimelineResponse;
import com.placement.career.entity.JobApplication;
import com.placement.career.entity.StudentProfile;
import com.placement.career.entity.User;
import com.placement.career.repository.JobApplicationRepository;
import com.placement.career.repository.StudentProfileRepository;
import com.placement.career.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ApplicationTimelineService {

    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final JobApplicationRepository jobApplicationRepository;

    public ApplicationTimelineService(
            UserRepository userRepository,
            StudentProfileRepository studentProfileRepository,
            JobApplicationRepository jobApplicationRepository
    ) {
        this.userRepository = userRepository;
        this.studentProfileRepository = studentProfileRepository;
        this.jobApplicationRepository = jobApplicationRepository;
    }

    public List<ApplicationTimelineResponse> getMyApplicationTimeline(
            String email
    ) {

        // 1. Find logged-in user
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // 2. Find student profile
        StudentProfile student = studentProfileRepository
                .findByUserId(user.getId())
                .orElseThrow(() -> new RuntimeException(
                        "Student profile not found"
                ));

        // 3. Find all applications
        List<JobApplication> applications =
                jobApplicationRepository
                        .findByStudentIdOrderByAppliedAtDesc(student.getId());

        // 4. Convert applications to timeline response
        return applications.stream()
                .map(this::toResponse)
                .toList();
    }

    private ApplicationTimelineResponse toResponse(
            JobApplication application
    ) {

        return new ApplicationTimelineResponse(
                application.getId(),
                application.getJob().getId(),
                application.getJob().getTitle(),
                application.getJob().getCompany().getName(),
                application.getStatus(),
                application.getAppliedAt(),
                application.getUpdatedAt(),
                application.getRecruiterNote()
        );
    }
}
