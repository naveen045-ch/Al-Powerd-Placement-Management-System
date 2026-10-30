package com.placement.career.controller;

import com.placement.career.dto.SkillCreateRequest;
import com.placement.career.dto.SkillResponse;
import com.placement.career.service.SkillService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/skills")
public class SkillController {

    private final SkillService skillService;

    public SkillController(SkillService skillService) {
        this.skillService = skillService;
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SkillResponse> createSkill(
            @Valid @RequestBody SkillCreateRequest request) {

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(skillService.createSkill(request));
    }

    @GetMapping
    public List<SkillResponse> getAllSkills() {

        return skillService.getAllSkills();
    }
}
