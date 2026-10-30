package com.placement.career.dto;

import com.placement.career.entity.ApplicationStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ApplicationStatusRequest(

        @NotNull
        ApplicationStatus status,

        @Size(max = 1000)
        String recruiterNote
) {
}
