package com.placement.career.controller;

import com.placement.career.dto.CareerRecommendationRequest;
import com.placement.career.dto.CareerRecommendationResponse;
import com.placement.career.service.CareerRecommendationService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/students/me/skill-gap-analysis")
@PreAuthorize("hasRole('STUDENT')")
public class SkillGapAnalysisController {

    private final CareerRecommendationService careerRecommendationService;

    public SkillGapAnalysisController(
            CareerRecommendationService careerRecommendationService) {
        this.careerRecommendationService = careerRecommendationService;
    }

    @PostMapping
    public CareerRecommendationResponse analyzeSkillGap(
            Authentication authentication,
            @Valid @RequestBody CareerRecommendationRequest request) {

        return careerRecommendationService.generate(
                authentication.getName(),
                request
        );
    }
}
