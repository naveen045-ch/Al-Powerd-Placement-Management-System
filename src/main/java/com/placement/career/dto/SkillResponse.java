package com.placement.career.dto;

import com.placement.career.entity.SkillCategory;

public record SkillResponse(

        Long id,
        String name,
        SkillCategory category

) {}
