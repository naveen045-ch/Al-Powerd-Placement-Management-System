package com.placement.career.service;

import com.google.genai.Client;
import com.google.genai.types.GenerateContentResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class AiAnswerEvaluationService {

    private final Client geminiClient;
    private final String model;

    public AiAnswerEvaluationService(
            Client geminiClient,
            @Value("${gemini.model}") String model) {

        this.geminiClient = geminiClient;
        this.model = model;
    }

    public EvaluationResult evaluate(
            String question,
            String answer) {

        if (answer == null || answer.isBlank()) {
            return new EvaluationResult(
                    0.0,
                    "No answer was provided."
            );
        }

        String prompt = """
                You are an expert technical interviewer evaluating a candidate's answer.

                Interview Question:
                %s

                Candidate Answer:
                %s

                Evaluate the answer based on:
                1. Technical correctness
                2. Relevance to the question
                3. Completeness
                4. Clarity
                5. Practical understanding

                Give a score from 0 to 10.

                Scoring guide:
                0-2: Incorrect or almost no understanding
                3-4: Limited understanding with major gaps
                5-6: Basic understanding but missing important details
                7-8: Good and technically correct answer
                9-10: Excellent, complete and technically strong answer

                Return the response ONLY in this exact format:

                SCORE: <number>
                FEEDBACK: <short personalized feedback>

                Do not include any other text.
                """.formatted(question, answer);

        try {

            GenerateContentResponse response =
                    geminiClient.models.generateContent(
                            model,
                            prompt,
                            null
                    );

            String result = response.text();

            if (result == null || result.isBlank()) {
                throw new RuntimeException(
                        "Gemini returned no evaluation"
                );
            }

            return parseEvaluation(result);

        } catch (Exception e) {

            throw new RuntimeException(
                    "Gemini answer evaluation failed: " + e.getMessage(),
                    e
            );
        }
    }

    private EvaluationResult parseEvaluation(String result) {

        double score = 0.0;
        String feedback = "Unable to generate feedback.";

        String[] lines = result.split("\\R");

        for (String line : lines) {

            String trimmed = line.trim();

            if (trimmed.toUpperCase().startsWith("SCORE:")) {

                String scoreText =
                        trimmed.substring(6).trim();

                try {
                    score = Double.parseDouble(scoreText);
                } catch (NumberFormatException ignored) {
                    score = 0.0;
                }
            }

            if (trimmed.toUpperCase().startsWith("FEEDBACK:")) {

                feedback =
                        trimmed.substring(9).trim();
            }
        }

        score = Math.max(0.0, Math.min(10.0, score));

        return new EvaluationResult(
                score,
                feedback
        );
    }

    public record EvaluationResult(
            Double score,
            String feedback
    ) {
    }
}