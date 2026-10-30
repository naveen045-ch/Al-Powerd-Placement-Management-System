package com.placement.career.service;

import com.google.genai.Client;
import com.google.genai.types.GenerateContentResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class GeminiService {

    private final Client geminiClient;
    private final String model;

    public GeminiService(
            Client geminiClient,
            @Value("${gemini.model}") String model) {

        this.geminiClient = geminiClient;
        this.model = model;
    }

    public String generateInterviewQuestion(
            String interviewType,
            String targetRole,
            int questionNumber) {

        String prompt = """
                Generate one interview question.

                Interview type: %s
                Target role: %s
                Question number: %d

                Requirements:
                - Ask a practical interview question.
                - Focus on skills relevant to the target role.
                - Do not include the answer.
                - Return only the question text.
                """.formatted(
                interviewType,
                targetRole,
                questionNumber
        );

        GenerateContentResponse response =
                geminiClient.models.generateContent(
                        model,
                        prompt,
                        null
                );

        String text = response.text();

        if (text == null || text.isBlank()) {
            throw new RuntimeException(
                    "Gemini returned no text response"
            );
        }

        return text.trim();
    }
}