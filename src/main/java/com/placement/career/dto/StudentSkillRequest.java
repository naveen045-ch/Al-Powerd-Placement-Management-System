package com.placement.career.dto;

import com.placement.career.entity.ProficiencyLevel;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record StudentSkillRequest(

        @NotNull
        Long skillId,

        @NotNull
        ProficiencyLevel proficiency,

        @NotNull
        @Min(0)
        Integer yearsOfExperience

) {}
