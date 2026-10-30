
package com.placement.career.controller;

import com.placement.career.dto.ResumeAnalysisResponse;
import com.placement.career.service.ResumeAnalysisHistoryService;
import com.placement.career.service.ResumeAnalysisService;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/students/me/resume")
public class ResumeAnalysisController {

    private final ResumeAnalysisService resumeAnalysisService;
    private final ResumeAnalysisHistoryService resumeAnalysisHistoryService;

    public ResumeAnalysisController(
            ResumeAnalysisService resumeAnalysisService,
            ResumeAnalysisHistoryService resumeAnalysisHistoryService) {

        this.resumeAnalysisService = resumeAnalysisService;
        this.resumeAnalysisHistoryService = resumeAnalysisHistoryService;
    }

    @PostMapping(
            value = "/analyze",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ResumeAnalysisResponse analyzeResume(
            @RequestParam("file") MultipartFile file,
            @RequestParam("targetRole") String targetRole,
            @RequestParam("jobDescription") String jobDescription,
            Authentication authentication) {

        // Step 1: Generate AI resume analysis
        ResumeAnalysisResponse result = resumeAnalysisService.analyze(
                file,
                targetRole,
                jobDescription
        );

        // Step 2: Save the analysis in database
        resumeAnalysisHistoryService.saveAnalysis(
                authentication.getName(),
                targetRole,
                result
        );

        // Step 3: Return the result to frontend
        return result;
    }
}
