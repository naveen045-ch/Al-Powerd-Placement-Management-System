package com.placement.career.controller;

import com.placement.career.dto.AiInterviewSessionResponse;
import com.placement.career.dto.AiInterviewStartRequest;
import com.placement.career.service.AiInterviewService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import com.placement.career.dto.AiInterviewQuestionResponse;
import com.placement.career.dto.AiInterviewAnswerRequest;

import java.util.List;

@RestController
@RequestMapping("/api/students/me/ai-interviews")
@PreAuthorize("hasRole('STUDENT')")
public class AiInterviewController {

    private final AiInterviewService aiInterviewService;

    public AiInterviewController(AiInterviewService aiInterviewService) {
        this.aiInterviewService = aiInterviewService;
    }

    @PostMapping
    public AiInterviewSessionResponse startInterview(
            Authentication authentication,
            @Valid @RequestBody AiInterviewStartRequest request) {

        return aiInterviewService.startInterview(
                authentication.getName(),
                request
        );
    }

    @GetMapping
    public List<AiInterviewSessionResponse> getMyInterviews(
            Authentication authentication) {

        return aiInterviewService.getMyInterviews(
                authentication.getName()
        );
    }

    @GetMapping("/{sessionId}")
    public AiInterviewSessionResponse getMyInterview(
            Authentication authentication,
            @PathVariable Long sessionId) {

        return aiInterviewService.getMyInterview(
                authentication.getName(),
                sessionId
        );
    }
    @GetMapping("/{sessionId}/questions")
    public List<AiInterviewQuestionResponse> getMyQuestions(
            Authentication authentication,
            @PathVariable Long sessionId) {

        return aiInterviewService.getMyQuestions(
                authentication.getName(),
                sessionId
        );
    }
    @PostMapping("/{sessionId}/questions/{questionId}/answer")
    public AiInterviewQuestionResponse submitAnswer(
            Authentication authentication,
            @PathVariable Long sessionId,
            @PathVariable Long questionId,
            @Valid @RequestBody AiInterviewAnswerRequest request) {

        return aiInterviewService.submitAnswer(
                authentication.getName(),
                sessionId,
                questionId,
                request
        );
    }
}