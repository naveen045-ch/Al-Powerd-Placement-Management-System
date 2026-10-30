package com.placement.career.dto;

public record AiInterviewQuestionResponse(
        Long id,
        Integer questionNumber,
        String question,
        String topic,
        String difficulty,
        String answer,
        Double score,
        String feedback
) {
}