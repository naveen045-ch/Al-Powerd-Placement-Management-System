package com.placement.career.service;

import com.placement.career.dto.InterviewRequest;
import com.placement.career.dto.InterviewResponse;
import com.placement.career.entity.ApplicationStatus;
import com.placement.career.entity.Interview;
import com.placement.career.entity.JobApplication;
import com.placement.career.repository.InterviewRepository;
import com.placement.career.repository.JobApplicationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.placement.career.dto.InterviewResponse;
import com.placement.career.entity.Interview;
import com.placement.career.entity.StudentProfile;
import com.placement.career.entity.User;
import com.placement.career.repository.StudentProfileRepository;
import com.placement.career.repository.UserRepository;

import java.util.List;

@Service
public class InterviewService {

    private final InterviewRepository interviewRepository;
    private final JobApplicationRepository jobApplicationRepository;
    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final NotificationService notificationService;

    public InterviewService(
            InterviewRepository interviewRepository,
            JobApplicationRepository jobApplicationRepository,
            UserRepository userRepository,
            StudentProfileRepository studentProfileRepository,
            NotificationService notificationService
    ) {
        this.interviewRepository = interviewRepository;
        this.jobApplicationRepository = jobApplicationRepository;
        this.userRepository = userRepository;
        this.studentProfileRepository = studentProfileRepository;
        this.notificationService = notificationService;
    }

    @Transactional
    public InterviewResponse scheduleInterview(
            String recruiterEmail,
            Long applicationId,
            InterviewRequest request
    ) {

        // 1. Find application
        JobApplication application = jobApplicationRepository
                .findById(applicationId)
                .orElseThrow(() ->
                        new RuntimeException("Application not found"));


        // 2. Check recruiter owns the job
        String jobOwnerEmail = application
                .getJob()
                .getRecruiter()
                .getUser()
                .getEmail();

        if (!jobOwnerEmail.equalsIgnoreCase(recruiterEmail)) {
            throw new RuntimeException(
                    "You are not authorized to manage this application"
            );
        }

        // 3. Application must be shortlisted or already in interview stage
        if (application.getStatus() != ApplicationStatus.SHORTLISTED
                && application.getStatus() != ApplicationStatus.INTERVIEW) {

            throw new RuntimeException(
                    "Application must be SHORTLISTED before scheduling an interview"
            );
        }

        // 4. Find existing interview or create new one
        Interview interview = interviewRepository
                .findByApplicationId(applicationId)
                .orElseGet(Interview::new);

        interview.setApplication(application);
        interview.setInterviewDateTime(request.interviewDateTime());
        interview.setMode(request.mode());
        interview.setLocationOrLink(request.locationOrLink());
        interview.setNotes(request.notes());

        Interview savedInterview = interviewRepository.save(interview);

        // 5. Change application status to INTERVIEW
        application.setStatus(ApplicationStatus.INTERVIEW);
        jobApplicationRepository.save(application);

        // 6. Notify student
        notificationService.createNotification(
                application.getStudent().getUser().getId(),
                "Interview Scheduled",
                "An interview has been scheduled for your application for "
                        + application.getJob().getTitle()
                        + " on "
                        + request.interviewDateTime()
        );

        return toResponse(savedInterview);
    }

    public InterviewResponse getInterview(
            String recruiterEmail,
            Long applicationId
    ) {

        JobApplication application = jobApplicationRepository
                .findById(applicationId)
                .orElseThrow(() ->
                        new RuntimeException("Application not found"));

        checkRecruiterOwnership(application, recruiterEmail);

        Interview interview = interviewRepository
                .findByApplicationId(applicationId)
                .orElseThrow(() ->
                        new RuntimeException("Interview not found"));

        return toResponse(interview);
    }

    private void checkRecruiterOwnership(
            JobApplication application,
            String recruiterEmail
    ) {

        String jobOwnerEmail = application
                .getJob()
                .getRecruiter()
                .getUser()
                .getEmail();

        if (!jobOwnerEmail.equalsIgnoreCase(recruiterEmail)) {
            throw new RuntimeException(
                    "You are not authorized to manage this application"
            );
        }
    }

    private InterviewResponse toResponse(Interview interview) {

        JobApplication application = interview.getApplication();

        return new InterviewResponse(
                interview.getId(),
                application.getId(),
                application.getJob().getId(),
                application.getJob().getTitle(),
                application.getStudent().getUser().getFullName(),
                application.getJob().getCompany().getName(),
                interview.getInterviewDateTime(),
                interview.getMode(),
                interview.getLocationOrLink(),
                interview.getNotes()
        );
    }
    public List<InterviewResponse> getMyInterviews(String email) {

        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        StudentProfile student = studentProfileRepository
                .findByUserId(user.getId())
                .orElseThrow(() -> new RuntimeException(
                        "Student profile not found"
                ));

        List<Interview> interviews =
                interviewRepository.findByApplicationStudentId(
                        student.getId()
                );

        return interviews.stream()
                .map(this::toResponse)
                .toList();
    }
}
