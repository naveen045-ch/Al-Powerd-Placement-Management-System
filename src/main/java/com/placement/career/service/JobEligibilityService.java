package com.placement.career.service;

import com.placement.career.dto.EligibilityResponse;
import com.placement.career.entity.Job;
import com.placement.career.entity.Skill;
import com.placement.career.entity.StudentProfile;
import com.placement.career.entity.StudentSkill;
import com.placement.career.entity.User;
import com.placement.career.exception.ResourceNotFoundException;
import com.placement.career.repository.JobApplicationRepository;
import com.placement.career.repository.JobRepository;
import com.placement.career.repository.StudentProfileRepository;
import com.placement.career.repository.StudentSkillRepository;
import com.placement.career.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class JobEligibilityService {

    private final JobRepository jobRepository;
    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final StudentSkillRepository studentSkillRepository;
    private final JobApplicationRepository jobApplicationRepository;

    public JobEligibilityService(
            JobRepository jobRepository,
            UserRepository userRepository,
            StudentProfileRepository studentProfileRepository,
            StudentSkillRepository studentSkillRepository,
            JobApplicationRepository jobApplicationRepository
    ) {
        this.jobRepository = jobRepository;
        this.userRepository = userRepository;
        this.studentProfileRepository = studentProfileRepository;
        this.studentSkillRepository = studentSkillRepository;
        this.jobApplicationRepository = jobApplicationRepository;
    }

    @Transactional(readOnly = true)
    public EligibilityResponse checkEligibility(
            String email,
            Long jobId) {

        // 1. Find job
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Job not found"));

        // 2. Find logged-in user
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() ->
                        new ResourceNotFoundException("User not found"));

        // 3. Find student profile
        StudentProfile student =
                studentProfileRepository.findByUserId(user.getId())
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Student profile not found"));

        List<String> eligibilityReasons = new ArrayList<>();

        // 4. Check job active status
        boolean jobActive = job.isActive();

        if (!jobActive) {
            eligibilityReasons.add("Job is no longer active");
        }

        // 5. Check application deadline
        boolean deadlinePassed =
                job.getApplicationDeadline() != null
                        && job.getApplicationDeadline()
                        .isBefore(LocalDateTime.now());

        if (deadlinePassed) {
            eligibilityReasons.add("Application deadline has passed");
        }

        // 6. Check CGPA
        Double studentCgpa = student.getCgpa();
        Double requiredCgpa = job.getMinimumCgpa();

        boolean cgpaEligible =
                requiredCgpa == null ||
                        (studentCgpa != null &&
                                studentCgpa >= requiredCgpa);

        if (!cgpaEligible) {
            if (studentCgpa == null) {
                eligibilityReasons.add(
                        "Student CGPA is not available");
            } else {
                eligibilityReasons.add(
                        "Minimum CGPA required is "
                                + requiredCgpa
                                + ", but your CGPA is "
                                + studentCgpa);
            }
        }

        // 7. Check graduation year
        Integer studentGraduationYear =
                student.getGraduationYear();

        Integer requiredGraduationYear =
                job.getGraduationYear();

        boolean graduationYearEligible =
                requiredGraduationYear == null ||
                        (studentGraduationYear != null &&
                                studentGraduationYear >=
                                        requiredGraduationYear);

        if (!graduationYearEligible) {
            if (studentGraduationYear == null) {
                eligibilityReasons.add(
                        "Student graduation year is not available");
            } else {
                eligibilityReasons.add(
                        "Required graduation year is "
                                + requiredGraduationYear
                                + ", but your graduation year is "
                                + studentGraduationYear);
            }
        }

        // 8. Get student's skills
        List<StudentSkill> studentSkills =
                studentSkillRepository.findByStudentId(
                        student.getId());

        Set<String> studentSkillNames = new HashSet<>();

        for (StudentSkill studentSkill : studentSkills) {

            if (studentSkill.getSkill() != null
                    && studentSkill.getSkill().getName() != null) {

                studentSkillNames.add(
                        studentSkill.getSkill()
                                .getName()
                                .toLowerCase()
                );
            }
        }

        // 9. Compare required skills
        List<String> matchedSkills = new ArrayList<>();
        List<String> missingSkills = new ArrayList<>();

        if (job.getRequiredSkills() != null) {

            for (Skill requiredSkill :
                    job.getRequiredSkills()) {

                String skillName =
                        requiredSkill.getName();

                if (studentSkillNames.contains(
                        skillName.toLowerCase())) {

                    matchedSkills.add(skillName);

                } else {

                    missingSkills.add(skillName);
                }
            }
        }

        // 10. Calculate skill match percentage
        int totalRequiredSkills =
                job.getRequiredSkills() == null
                        ? 0
                        : job.getRequiredSkills().size();

        int matchedSkillCount =
                matchedSkills.size();

        double skillMatchPercentage;

        if (totalRequiredSkills == 0) {

            skillMatchPercentage = 100.0;

        } else {

            skillMatchPercentage =
                    ((double) matchedSkillCount
                            / totalRequiredSkills) * 100;
        }

        // 11. Skill eligibility
        boolean skillEligible =
                missingSkills.isEmpty();

        if (!skillEligible) {

            eligibilityReasons.add(
                    "Missing required skills: "
                            + String.join(
                            ", ",
                            missingSkills));
        }

        // 12. Check whether student already applied
        boolean alreadyApplied =
                jobApplicationRepository
                        .existsByJobIdAndStudentId(
                                jobId,
                                student.getId());

        if (alreadyApplied) {

            eligibilityReasons.add(
                    "You have already applied for this job");
        }

        // 13. Overall eligibility
        boolean eligible =
                cgpaEligible
                        && graduationYearEligible
                        && skillEligible
                        && jobActive
                        && !deadlinePassed
                        && !alreadyApplied;

        // 14. Return response
        return new EligibilityResponse(
                job.getId(),
                job.getTitle(),

                cgpaEligible,
                graduationYearEligible,
                skillEligible,
                jobActive,
                deadlinePassed,
                alreadyApplied,
                eligible,

                studentCgpa,
                requiredCgpa,

                studentGraduationYear,
                requiredGraduationYear,

                matchedSkills,
                missingSkills,

                totalRequiredSkills,
                matchedSkillCount,
                skillMatchPercentage,

                eligibilityReasons
        );
    }
}