
package com.placement.career.dto;

import com.placement.career.entity.SkillCategory;

public record SkillCatalogResponse(
        Long id,
        String name,
        SkillCategory category
) {
}
