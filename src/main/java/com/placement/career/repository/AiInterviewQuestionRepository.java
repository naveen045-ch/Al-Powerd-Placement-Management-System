package com.placement.career.repository;

import com.placement.career.entity.AiInterviewQuestion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AiInterviewQuestionRepository
        extends JpaRepository<AiInterviewQuestion, Long> {

    List<AiInterviewQuestion> findBySessionIdOrderByQuestionNumberAsc(
            Long sessionId
    );
}