package com.placement.career.repository;

import com.placement.career.entity.ResumeAnalysisHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ResumeAnalysisHistoryRepository
        extends JpaRepository<ResumeAnalysisHistory, Long> {

    List<ResumeAnalysisHistory> findByStudentIdOrderByCreatedAtDesc(
            Long studentId
    );

    Optional<ResumeAnalysisHistory> findByIdAndStudentId(
            Long id,
            Long studentId
    );
}