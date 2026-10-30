package com.placement.career.controller;

import com.placement.career.dto.ResumeAnalysisHistoryDetail;
import com.placement.career.dto.ResumeAnalysisHistoryItem;
import com.placement.career.service.ResumeAnalysisHistoryService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/students/me/resume/analysis-history")
public class ResumeAnalysisHistoryController {

    private final ResumeAnalysisHistoryService historyService;

    public ResumeAnalysisHistoryController(
            ResumeAnalysisHistoryService historyService
    ) {
        this.historyService = historyService;
    }

    @GetMapping
    public List<ResumeAnalysisHistoryItem> getHistory(
            Authentication authentication
    ) {
        return historyService.getHistory(authentication.getName());
    }

    @GetMapping("/{id}")
    public ResumeAnalysisHistoryDetail getHistoryDetail(
            @PathVariable Long id,
            Authentication authentication
    ) {
        return historyService.getHistoryDetail(
                authentication.getName(),
                id
        );
    }
}