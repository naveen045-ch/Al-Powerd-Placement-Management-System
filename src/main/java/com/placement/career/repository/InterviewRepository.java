package com.placement.career.repository;

import com.placement.career.entity.Interview;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface InterviewRepository extends JpaRepository<Interview, Long> {

    Optional<Interview> findByApplicationId(Long applicationId);

    boolean existsByApplicationId(Long applicationId);

    List<Interview> findByApplicationStudentId(Long studentId);
}
