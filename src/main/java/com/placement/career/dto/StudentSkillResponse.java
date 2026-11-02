
package com.placement.career.dto;

import com.placement.career.entity.ProficiencyLevel;
import com.placement.career.entity.SkillCategory;

public record StudentSkillResponse(
        Long id,
        Long skillId,
        String skillName,
        SkillCategory category,
        ProficiencyLevel proficiency,
        Integer yearsOfExperience
) {
}
