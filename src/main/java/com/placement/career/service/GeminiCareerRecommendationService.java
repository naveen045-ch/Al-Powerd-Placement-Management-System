
package com.placement.career.service;

import com.google.genai.Client;
import com.google.genai.types.GenerateContentResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class GeminiCareerRecommendationService {

    private final Client geminiClient;
    private final String model;

    public GeminiCareerRecommendationService(
            Client geminiClient,
            @Value("${gemini.model}") String model) {
        this.geminiClient = geminiClient;
        this.model = model;
    }

    public String generateRecommendation(
            String studentProfile,
            String skills,
            String interviewPerformance,
            String targetRole) {

        String selectedRole =
                targetRole == null || targetRole.isBlank()
                        ? "No specific target role. Recommend suitable roles."
                        : targetRole.trim();

        String prompt = """
                You are an expert career advisor for software engineering students.

                Analyze the student's information below and generate a practical,
                personalized career recommendation.

                STUDENT PROFILE:
                %s

                SKILLS:
                %s

                AI INTERVIEW PERFORMANCE:
                %s

                TARGET ROLE:
                %s

                STRICT OUTPUT FORMAT:

                Return exactly these seven section headings, each on its own line.
                Keep the heading text exactly as written below.
                Write meaningful content beneath every heading.
                Do not omit any section.
                Do not return JSON, introductory text, or a conclusion outside
                these sections.
                Do not use Markdown heading symbols or bold formatting.
                Do not leave any section empty.

                RECOMMENDED ROLES:
                Suggest 3-5 suitable software engineering roles.

                STRENGTHS:
                Identify demonstrated skills and advantages from the provided data.

                SKILL GAPS:
                Identify skills the student should improve. If information is
                insufficient, state what should be assessed rather than guessing.

                RECOMMENDED TECHNOLOGIES:
                Recommend relevant technologies, frameworks, and tools.

                LEARNING ROADMAP:
                Give an ordered, practical learning roadmap with clear priorities.

                PLACEMENT ADVICE:
                Give specific, actionable advice for getting a software engineering job.

                OVERALL ASSESSMENT:
                Summarize career readiness using only the available evidence.

                Be realistic for a B.Tech Computer Science student.
                Never invent qualifications, experience, projects, or interview scores.
                Distinguish known information from recommendations.
                """.formatted(
                studentProfile,
                skills,
                interviewPerformance,
                selectedRole
        );

        GenerateContentResponse response =
                geminiClient.models.generateContent(
                        model,
                        prompt,
                        null
                );

        String text = response.text();

        if (text == null || text.isBlank()) {
            throw new IllegalStateException(
                    "Gemini returned an empty career recommendation."
            );
        }

        return text.trim();
    }
}
