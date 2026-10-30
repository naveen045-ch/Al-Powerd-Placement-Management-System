package com.placement.career.dto;

import com.placement.career.entity.ProficiencyLevel;

public record StudentSkillResponse(

        Long id,
        Long skillId,
        String skillName,
        ProficiencyLevel proficiency,
        Integer yearsOfExperience

) {}