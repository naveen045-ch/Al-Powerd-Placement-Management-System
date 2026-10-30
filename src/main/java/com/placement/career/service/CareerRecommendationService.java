package com.placement.career.service;

import com.placement.career.dto.CareerRecommendationRequest;
import com.placement.career.dto.CareerRecommendationResponse;
import com.placement.career.entity.*;
import com.placement.career.repository.CareerRecommendationRepository;
import com.placement.career.repository.StudentProfileRepository;
import com.placement.career.repository.UserRepository;
import com.placement.career.repository.StudentSkillRepository;
import com.placement.career.repository.AiInterviewSessionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CareerRecommendationService {

    private final CareerRecommendationRepository recommendationRepository;
    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final StudentSkillRepository studentSkillRepository;
    private final AiInterviewSessionRepository aiInterviewSessionRepository;
    private final GeminiCareerRecommendationService geminiService;

    public CareerRecommendationService(
            CareerRecommendationRepository recommendationRepository,
            UserRepository userRepository,
            StudentProfileRepository studentProfileRepository,
            StudentSkillRepository studentSkillRepository,
            AiInterviewSessionRepository aiInterviewSessionRepository,
            GeminiCareerRecommendationService geminiService) {

        this.recommendationRepository = recommendationRepository;
        this.userRepository = userRepository;
        this.studentProfileRepository = studentProfileRepository;
        this.studentSkillRepository = studentSkillRepository;
        this.aiInterviewSessionRepository = aiInterviewSessionRepository;
        this.geminiService = geminiService;
    }

    @Transactional
    public CareerRecommendationResponse generate(
            String email,
            CareerRecommendationRequest request) {

        try {

                User student = userRepository.findByEmailIgnoreCase(email)
                        .orElseThrow(() ->
                                new RuntimeException("Student not found"));

                StudentProfile profile =
                        studentProfileRepository.findByUserId(student.getId())
                                .orElseThrow(() ->
                                        new RuntimeException("Student profile not found"));

                List<StudentSkill> studentSkills =
                        studentSkillRepository.findByStudentId(student.getId());

                List<AiInterviewSession> interviews =
                        aiInterviewSessionRepository
                                .findByStudentIdOrderByStartedAtDesc(student.getId());

                String profileText = """
                Name: %s
                College: %s
                Branch: %s
                Semester: %s
                CGPA: %s
                Graduation Year: %s
                GitHub: %s
                LinkedIn: %s
                Bio: %s
                """.formatted(
                        student.getFullName(),
                        profile.getCollege(),
                        profile.getBranch(),
                        profile.getSemester(),
                        profile.getCgpa(),
                        profile.getGraduationYear(),
                        profile.getGithubUrl(),
                        profile.getLinkedinUrl(),
                        profile.getBio()
                );

                String skillsText = studentSkills.isEmpty()
                        ? "No skills have been added yet."
                        : studentSkills.stream()
                        .map(skill ->
                             skill.getSkill().getName()
                             + " - proficiency: "
                             + skill.getProficiency()
                             + ", experience: "
                             + skill.getYearsOfExperience()
                             + " years")
                        .reduce((a, b) -> a + "\n" + b)
                        .orElse("No skills available.");

                String interviewText = interviews.isEmpty()
                        ? "No AI interviews completed yet."
                        : interviews.stream()
                        .limit(5)
                        .map(interview ->
                             "Type: " + interview.getInterviewType()
                             + ", Role: " + interview.getTargetRole()
                             + ", Score: " + interview.getOverallScore()
                             + ", Status: " + interview.getStatus())
                        .reduce((a, b) -> a + "\n" + b)
                        .orElse("No interview data available.");

                String recommendationText =
                        geminiService.generateRecommendation(
                                profileText,
                                skillsText,
                                interviewText,
                                request == null ? null : request.targetRole()
                        );

                CareerRecommendation recommendation =
                        new CareerRecommendation();

                recommendation.setStudent(student);
                recommendation.setTargetRole(
                        request == null ? null : request.targetRole()
                );

                parseRecommendation(recommendation, recommendationText);

                CareerRecommendation saved =
                        recommendationRepository.save(recommendation);

                return toResponse(saved);

        } catch (Exception e) {

            System.err.println("========== CAREER RECOMMENDATION ERROR ==========");
            System.err.println("Error type: " + e.getClass().getName());
            System.err.println("Error message: " + e.getMessage());
            e.printStackTrace();
            System.err.println("=================================================");

            throw e;
        }
    }

    @Transactional(readOnly = true)
    public List<CareerRecommendationResponse> getMyRecommendations(
            String email) {

        User student = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() ->
                        new RuntimeException("Student not found"));

        return recommendationRepository
                .findByStudentIdOrderByGeneratedAtDesc(student.getId())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private void parseRecommendation(
            CareerRecommendation recommendation,
            String text) {

        String normalized = text
                .replace("**", "")
                .replace("___", "")
                .replace("---", "");

        // Remove Markdown heading symbols
        normalized = normalized.replaceAll(
                "(?m)^\\s*#{1,6}\\s*",
                ""
        );

        // Normalize our expected section names
        normalized = normalized.replaceAll(
                "(?im)^\\s*RECOMMENDED ROLES\\s*:?[ \\t]*$",
                "RECOMMENDED ROLES:"
        );

        normalized = normalized.replaceAll(
                "(?im)^\\s*STRENGTHS\\s*:?[ \\t]*$",
                "STRENGTHS:"
        );

        normalized = normalized.replaceAll(
                "(?im)^\\s*SKILL GAPS\\s*:?[ \\t]*$",
                "SKILL GAPS:"
        );

        normalized = normalized.replaceAll(
                "(?im)^\\s*RECOMMENDED TECHNOLOGIES\\s*:?[ \\t]*$",
                "RECOMMENDED TECHNOLOGIES:"
        );

        normalized = normalized.replaceAll(
                "(?im)^\\s*LEARNING ROADMAP\\s*:?[ \\t]*$",
                "LEARNING ROADMAP:"
        );

        normalized = normalized.replaceAll(
                "(?im)^\\s*PLACEMENT ADVICE\\s*:?[ \\t]*$",
                "PLACEMENT ADVICE:"
        );

        normalized = normalized.replaceAll(
                "(?im)^\\s*OVERALL ASSESSMENT\\s*:?[ \\t]*$",
                "OVERALL ASSESSMENT:"
        );

        String[] sections = normalized.split(
                "(?i)(?=RECOMMENDED ROLES:|STRENGTHS:|SKILL GAPS:|RECOMMENDED TECHNOLOGIES:|LEARNING ROADMAP:|PLACEMENT ADVICE:|OVERALL ASSESSMENT:)"
        );

        for (String section : sections) {

            String value = section.trim();

            if (value.isBlank()) {
                continue;
            }

            String upper = value.toUpperCase();

            if (upper.startsWith("RECOMMENDED ROLES:")) {

                recommendation.setRecommendedRoles(
                        removeHeader(value, "RECOMMENDED ROLES:")
                );

            } else if (upper.startsWith("STRENGTHS:")) {

                recommendation.setStrengths(
                        removeHeader(value, "STRENGTHS:")
                );

            } else if (upper.startsWith("SKILL GAPS:")) {

                recommendation.setSkillGaps(
                        removeHeader(value, "SKILL GAPS:")
                );

            } else if (upper.startsWith("RECOMMENDED TECHNOLOGIES:")) {

                recommendation.setRecommendedTechnologies(
                        removeHeader(value, "RECOMMENDED TECHNOLOGIES:")
                );

            } else if (upper.startsWith("LEARNING ROADMAP:")) {

                recommendation.setLearningRoadmap(
                        removeHeader(value, "LEARNING ROADMAP:")
                );

            } else if (upper.startsWith("PLACEMENT ADVICE:")) {

                recommendation.setPlacementAdvice(
                        removeHeader(value, "PLACEMENT ADVICE:")
                );

            } else if (upper.startsWith("OVERALL ASSESSMENT:")) {

                recommendation.setOverallAssessment(
                        removeHeader(value, "OVERALL ASSESSMENT:")
                );
            }
        }
    }

    private String removeHeader(
            String value,
            String header) {

        return value.substring(header.length()).trim();
    }

    private CareerRecommendationResponse toResponse(
            CareerRecommendation recommendation) {

        return new CareerRecommendationResponse(
                recommendation.getId(),
                recommendation.getTargetRole(),
                recommendation.getRecommendedRoles(),
                recommendation.getStrengths(),
                recommendation.getSkillGaps(),
                recommendation.getRecommendedTechnologies(),
                recommendation.getLearningRoadmap(),
                recommendation.getPlacementAdvice(),
                recommendation.getOverallAssessment(),
                recommendation.getGeneratedAt()
        );
    }
}
