package com.placement.career.repository;

import com.placement.career.entity.CareerRecommendation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CareerRecommendationRepository
        extends JpaRepository<CareerRecommendation, Long> {

    List<CareerRecommendation> findByStudentIdOrderByGeneratedAtDesc(Long studentId);
}