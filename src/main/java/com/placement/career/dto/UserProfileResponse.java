
package com.placement.career.dto;

import java.util.List;
import java.util.Set;

public record UserProfileResponse(
        Long userId,
        String fullName,
        String email,
        String phone,
        boolean enabled,
        Set<String> roles,
        StudentDetails studentProfile,
        RecruiterDetails recruiterProfile,
        CompanyDetails company
) {

    public record StudentDetails(
            String college,
            String branch,
            Integer semester,
            Double cgpa,
            Integer graduationYear,
            String githubUrl,
            String linkedinUrl,
            String bio,
            List<StudentSkillResponse> skills
    ) {
    }

    public record RecruiterDetails(
            String designation
    ) {
    }

    public record CompanyDetails(
            Long companyId,
            String name,
            String industry,
            String website,
            String location
    ) {
    }
}
