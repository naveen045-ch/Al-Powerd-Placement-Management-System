package com.placement.career.controller;

import com.placement.career.dto.CareerRecommendationRequest;
import com.placement.career.dto.CareerRecommendationResponse;
import com.placement.career.service.CareerRecommendationService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/students/me/career-recommendations")
@PreAuthorize("hasRole('STUDENT')")
public class CareerRecommendationController {

    private final CareerRecommendationService careerRecommendationService;

    public CareerRecommendationController(
            CareerRecommendationService careerRecommendationService) {
        this.careerRecommendationService = careerRecommendationService;
    }

    @PostMapping
    public ResponseEntity<CareerRecommendationResponse> generate(
            Authentication authentication,
            @Valid @RequestBody(required = false)
            CareerRecommendationRequest request) {

        CareerRecommendationResponse response =
                careerRecommendationService.generate(
                        authentication.getName(),
                        request
                );

        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<List<CareerRecommendationResponse>> getMyRecommendations(
            Authentication authentication) {

        return ResponseEntity.ok(
                careerRecommendationService.getMyRecommendations(
                        authentication.getName()
                )
        );
    }
}
