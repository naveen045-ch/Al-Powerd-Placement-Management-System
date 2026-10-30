package com.placement.career.repository;

import com.placement.career.entity.JobBookmark;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JobBookmarkRepository extends JpaRepository<JobBookmark, Long> {

    boolean existsByStudentIdAndJobId(Long studentId, Long jobId);

    Page<JobBookmark> findByStudentIdOrderByBookmarkedAtDesc(
            Long studentId,
            Pageable pageable
    );

    void deleteByStudentIdAndJobId(Long studentId, Long jobId);
}