package com.placement.career.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AiInterviewAnswerRequest(

        @NotBlank
        @Size(max = 5000)
        String answer
) {
}