package com.placement.career.service;

import com.placement.career.dto.JobRecommendationResponse;
import com.placement.career.entity.Job;
import com.placement.career.entity.Skill;
import com.placement.career.entity.StudentProfile;
import com.placement.career.entity.StudentSkill;
import com.placement.career.entity.User;
import com.placement.career.repository.JobRepository;
import com.placement.career.repository.StudentProfileRepository;
import com.placement.career.repository.StudentSkillRepository;
import com.placement.career.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class JobRecommendationService {

    private final JobRepository jobRepository;
    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final StudentSkillRepository studentSkillRepository;

    public JobRecommendationService(
            JobRepository jobRepository,
            UserRepository userRepository,
            StudentProfileRepository studentProfileRepository,
            StudentSkillRepository studentSkillRepository
    ) {
        this.jobRepository = jobRepository;
        this.userRepository = userRepository;
        this.studentProfileRepository = studentProfileRepository;
        this.studentSkillRepository = studentSkillRepository;
    }

    public List<JobRecommendationResponse> getRecommendations(String email) {

        // 1. Find user
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // 2. Find student profile
        StudentProfile student = studentProfileRepository
                .findByUserId(user.getId())
                .orElseThrow(() -> new RuntimeException("Student profile not found"));

        // 3. Get student's skills
        List<StudentSkill> studentSkills =
                studentSkillRepository.findByStudentId(student.getId());

        Set<String> studentSkillNames = new HashSet<>();

        for (StudentSkill studentSkill : studentSkills) {
            studentSkillNames.add(
                    studentSkill.getSkill().getName().toLowerCase()
            );
        }

        // 4. Get all active jobs
        List<Job> jobs = jobRepository.findByActiveTrueOrderByCreatedAtDesc();

        List<JobRecommendationResponse> recommendations = new ArrayList<>();

        // 5. Check every job
        for (Job job : jobs) {

            // CGPA check
            boolean cgpaEligible =
                    job.getMinimumCgpa() == null ||
                            (student.getCgpa() != null &&
                                    student.getCgpa() >= job.getMinimumCgpa());

            // Graduation year check
            boolean graduationEligible =
                    job.getGraduationYear() == null ||
                            (student.getGraduationYear() != null &&
                                    student.getGraduationYear() >= job.getGraduationYear());

            // Skill matching
            List<String> matchedSkills = new ArrayList<>();
            List<String> missingSkills = new ArrayList<>();

            for (Skill requiredSkill : job.getRequiredSkills()) {

                String skillName = requiredSkill.getName();

                if (studentSkillNames.contains(skillName.toLowerCase())) {
                    matchedSkills.add(skillName);
                } else {
                    missingSkills.add(skillName);
                }
            }

            int totalRequiredSkills = job.getRequiredSkills().size();
            int matchedSkillCount = matchedSkills.size();

            double skillMatchPercentage;

            if (totalRequiredSkills == 0) {
                skillMatchPercentage = 100.0;
            } else {
                skillMatchPercentage =
                        ((double) matchedSkillCount / totalRequiredSkills) * 100;
            }

            boolean skillEligible = missingSkills.isEmpty();

            boolean eligible =
                    cgpaEligible &&
                            graduationEligible &&
                            skillEligible;

            /*
             * Recommendation rule:
             * Show jobs where the student has at least
             * 50% skill match.
             */
            if (skillMatchPercentage >= 50.0) {

                recommendations.add(
                        new JobRecommendationResponse(
                                job.getId(),
                                job.getTitle(),
                                job.getCompany().getName(),
                                job.getLocation(),
                                job.getJobType().name(),
                                job.getMinimumCgpa(),
                                job.getGraduationYear(),
                                matchedSkills,
                                missingSkills,
                                totalRequiredSkills,
                                matchedSkillCount,
                                skillMatchPercentage,
                                eligible
                        )
                );
            }
        }

        // 6. Highest skill match first
        recommendations.sort(
                (a, b) -> Double.compare(
                        b.skillMatchPercentage(),
                        a.skillMatchPercentage()
                )
        );

        return recommendations;
    }
}
