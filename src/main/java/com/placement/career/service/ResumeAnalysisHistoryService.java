package com.placement.career.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.placement.career.dto.ResumeAnalysisHistoryDetail;
import com.placement.career.dto.ResumeAnalysisHistoryItem;
import com.placement.career.dto.ResumeAnalysisResponse;
import com.placement.career.entity.ResumeAnalysisHistory;
import com.placement.career.entity.User;
import com.placement.career.repository.ResumeAnalysisHistoryRepository;
import com.placement.career.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class ResumeAnalysisHistoryService {

    private final ResumeAnalysisHistoryRepository historyRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    public ResumeAnalysisHistoryService(
            ResumeAnalysisHistoryRepository historyRepository,
            UserRepository userRepository,
            ObjectMapper objectMapper
    ) {
        this.historyRepository = historyRepository;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public void saveAnalysis(
            String studentEmail,
            String targetRole,
            ResumeAnalysisResponse analysis
    ) {
        User student = getStudent(studentEmail);

        try {
            ResumeAnalysisHistory history = new ResumeAnalysisHistory();
            history.setStudent(student);
            history.setTargetRole(targetRole);
            history.setMatchScore(analysis.matchScore());
            history.setOverallSummary(analysis.overallSummary());
            history.setAnalysisJson(objectMapper.writeValueAsString(analysis));

            historyRepository.save(history);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException(
                    "Could not save the resume analysis result.",
                    exception
            );
        }
    }

    @Transactional(readOnly = true)
    public List<ResumeAnalysisHistoryItem> getHistory(String studentEmail) {
        User student = getStudent(studentEmail);

        return historyRepository
                .findByStudentIdOrderByCreatedAtDesc(student.getId())
                .stream()
                .map(item -> new ResumeAnalysisHistoryItem(
                        item.getId(),
                        item.getTargetRole(),
                        item.getMatchScore(),
                        item.getOverallSummary(),
                        item.getCreatedAt()
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public ResumeAnalysisHistoryDetail getHistoryDetail(
            String studentEmail,
            Long historyId
    ) {
        User student = getStudent(studentEmail);

        ResumeAnalysisHistory history = historyRepository
                .findByIdAndStudentId(historyId, student.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Resume analysis history not found."
                ));

        try {
            ResumeAnalysisResponse analysis = objectMapper.readValue(
                    history.getAnalysisJson(),
                    ResumeAnalysisResponse.class
            );

            return new ResumeAnalysisHistoryDetail(
                    history.getId(),
                    history.getTargetRole(),
                    history.getMatchScore(),
                    history.getOverallSummary(),
                    analysis.roleFitSummary(),
                    analysis.suggestedHeadline(),
                    history.getCreatedAt(),
                    analysis
            );
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException(
                    "Could not read the saved resume analysis.",
                    exception
            );
        }
    }

    private User getStudent(String email) {
        return userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Student account not found."
                ));
    }
}