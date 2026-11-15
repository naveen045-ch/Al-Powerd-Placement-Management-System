package com.placement.career.dto;

import com.placement.career.entity.ProficiencyLevel;
import com.placement.career.entity.SkillCategory;
import jakarta.validation.constraints.*;

public record StudentSkillCreateRequest(

        @NotBlank
        @Size(max = 100)
        String name,

        @NotNull
        SkillCategory category,

        @NotNull
        ProficiencyLevel proficiency,

        @NotNull
        @Min(0)
        @Max(60)
        Integer yearsOfExperience

) {}