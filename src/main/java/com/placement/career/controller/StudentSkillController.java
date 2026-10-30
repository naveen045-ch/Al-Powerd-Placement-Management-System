package com.placement.career.controller;

import com.placement.career.dto.*;
import com.placement.career.service.SkillService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/students/me/skills")
@PreAuthorize("hasRole('STUDENT')")
public class StudentSkillController {

    private final SkillService skillService;

    public StudentSkillController(SkillService skillService) {
        this.skillService = skillService;
    }

    @PostMapping
    public StudentSkillResponse addSkill(
            Authentication authentication,
            @Valid @RequestBody StudentSkillRequest request) {

        return skillService.addStudentSkill(
                authentication.getName(),
                request
        );
    }

    @GetMapping
    public List<StudentSkillResponse> getMySkills(
            Authentication authentication) {

        return skillService.getMySkills(
                authentication.getName()
        );
    }
    @PutMapping("/{studentSkillId}")
    public StudentSkillResponse updateSkill(
            Authentication authentication,
            @PathVariable Long studentSkillId,
            @Valid @RequestBody StudentSkillUpdateRequest request) {

        return skillService.updateStudentSkill(
                authentication.getName(),
                studentSkillId,
                request
        );
    }

    @DeleteMapping("/{studentSkillId}")
    public void deleteSkill(
            Authentication authentication,
            @PathVariable Long studentSkillId) {

        skillService.deleteStudentSkill(
                authentication.getName(),
                studentSkillId
        );
    }
}
