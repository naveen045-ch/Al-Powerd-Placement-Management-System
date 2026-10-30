package com.placement.career.repository;

import com.placement.career.entity.AiInterviewSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AiInterviewSessionRepository
        extends JpaRepository<AiInterviewSession, Long> {

    List<AiInterviewSession> findByStudentIdOrderByStartedAtDesc(Long studentId);
}