package com.placement.career.dto;

import com.placement.career.entity.InterviewMode;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public record InterviewRequest(

        @NotNull
        @Future
        LocalDateTime interviewDateTime,

        @NotNull
        InterviewMode mode,

        @Size(max = 500)
        String locationOrLink,

        @Size(max = 1000)
        String notes

) {
}
