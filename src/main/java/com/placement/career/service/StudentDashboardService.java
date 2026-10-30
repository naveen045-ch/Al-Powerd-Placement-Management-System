package com.placement.career.service;

import com.placement.career.dto.StudentDashboardResponse;
import com.placement.career.entity.ApplicationStatus;
import com.placement.career.entity.StudentProfile;
import com.placement.career.entity.StudentSkill;
import com.placement.career.entity.User;
import com.placement.career.repository.JobApplicationRepository;
import com.placement.career.repository.StudentProfileRepository;
import com.placement.career.repository.StudentSkillRepository;
import com.placement.career.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Service
public class StudentDashboardService {

    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final StudentSkillRepository studentSkillRepository;
    private final JobApplicationRepository jobApplicationRepository;

    public StudentDashboardService(
            UserRepository userRepository,
            StudentProfileRepository studentProfileRepository,
            StudentSkillRepository studentSkillRepository,
            JobApplicationRepository jobApplicationRepository
    ) {
        this.userRepository = userRepository;
        this.studentProfileRepository = studentProfileRepository;
        this.studentSkillRepository = studentSkillRepository;
        this.jobApplicationRepository = jobApplicationRepository;
    }

    public StudentDashboardResponse getDashboard(String email) {

        // 1. Find logged-in user
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // 2. Find student profile
        StudentProfile student = studentProfileRepository
                .findByUserId(user.getId())
                .orElseThrow(() -> new RuntimeException("Student profile not found"));

        // 3. Get student's skills
        List<StudentSkill> skills =
                studentSkillRepository.findByStudentId(student.getId());

        // 4. Get student's applications
        var applications =
                jobApplicationRepository.findByStudentIdOrderByAppliedAtDesc(
                        student.getId()
                );

        // 5. Count applications by status
        Map<ApplicationStatus, Long> applicationsByStatus =
                new EnumMap<>(ApplicationStatus.class);

        for (ApplicationStatus status : ApplicationStatus.values()) {
            applicationsByStatus.put(status, 0L);
        }

        applications.forEach(application ->
                applicationsByStatus.merge(
                        application.getStatus(),
                        1L,
                        Long::sum
                )
        );

        // 6. Return dashboard
        return new StudentDashboardResponse(
                student.getId(),
                user.getFullName(),
                user.getEmail(),
                skills.size(),
                applications.size(),
                applicationsByStatus
        );
    }
}