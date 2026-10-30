package com.placement.career.repository;

import com.placement.career.entity.Resume;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ResumeRepository extends JpaRepository<Resume, Long> {

    Optional<Resume> findByStudentId(Long studentId);

    boolean existsByStudentId(Long studentId);
}