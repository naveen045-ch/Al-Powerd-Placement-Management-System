package com.placement.career.repository;

import com.placement.career.entity.Job;
import com.placement.career.entity.JobType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface JobRepository extends JpaRepository<Job, Long> {

    List<Job> findByActiveTrueOrderByCreatedAtDesc();

    List<Job> findByRecruiterIdOrderByCreatedAtDesc(Long recruiterId);

    long countByRecruiterId(Long recruiterId);

    long countByRecruiterIdAndActiveTrue(Long recruiterId);

    Page<Job> findByActiveTrue(Pageable pageable);

    Page<Job> findByRecruiterId(Long recruiterId, Pageable pageable);
    @Query("""
    SELECT j
    FROM Job j
    WHERE j.active = true

      AND (
          :keyword IS NULL
          OR LOWER(j.title) LIKE LOWER(CONCAT('%', :keyword, '%'))
          OR LOWER(j.description) LIKE LOWER(CONCAT('%', :keyword, '%'))
      )

      AND (
          :location IS NULL
          OR LOWER(j.location) LIKE LOWER(CONCAT('%', :location, '%'))
      )

      AND (
          :jobType IS NULL
          OR j.jobType = :jobType
      )

      AND (
          :minimumCgpa IS NULL
          OR j.minimumCgpa IS NULL
          OR j.minimumCgpa <= :minimumCgpa
      )

      AND (
          :graduationYear IS NULL
          OR j.graduationYear = :graduationYear
      )
""")
    Page<Job> searchActiveJobs(
            @Param("keyword") String keyword,
            @Param("location") String location,
            @Param("jobType") JobType jobType,
            @Param("minimumCgpa") Double minimumCgpa,
            @Param("graduationYear") Integer graduationYear,
            Pageable pageable
    );
}