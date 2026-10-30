package com.placement.career.dto;

import com.placement.career.entity.SkillCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SkillCreateRequest(

        @NotBlank
        @Size(max = 100)
        String name,

        @NotNull
        SkillCategory category

) {}
