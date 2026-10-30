package com.placement.career.dto;

import java.util.List;

public record ResumeAnalysisResponse(
        Integer matchScore,
        String overallSummary,
        String roleFitSummary,
        String suggestedHeadline,
        List<String> strengths,
        List<String> matchedSkills,
        List<String> missingSkills,
        List<String> improvementSuggestions,
        List<String> suggestedKeywords,
        List<String> atsTips,
        List<String> interviewQuestions
) {
    public ResumeAnalysisResponse {
        matchScore = matchScore == null
                ? 0
                : Math.max(0, Math.min(100, matchScore));

        overallSummary = overallSummary == null
                ? ""
                : overallSummary;

        roleFitSummary = roleFitSummary == null
                ? ""
                : roleFitSummary;

        suggestedHeadline = suggestedHeadline == null
                ? ""
                : suggestedHeadline;

        strengths = strengths == null ? List.of() : List.copyOf(strengths);
        matchedSkills = matchedSkills == null
                ? List.of()
                : List.copyOf(matchedSkills);
        missingSkills = missingSkills == null
                ? List.of()
                : List.copyOf(missingSkills);
        improvementSuggestions = improvementSuggestions == null
                ? List.of()
                : List.copyOf(improvementSuggestions);
        suggestedKeywords = suggestedKeywords == null
                ? List.of()
                : List.copyOf(suggestedKeywords);
        atsTips = atsTips == null ? List.of() : List.copyOf(atsTips);
        interviewQuestions = interviewQuestions == null
                ? List.of()
                : List.copyOf(interviewQuestions);
    }
}
