package com.placement.career.repository;

import com.placement.career.entity.ApplicationStatus;
import com.placement.career.entity.JobApplication;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface JobApplicationRepository
        extends JpaRepository<JobApplication, Long> {

    boolean existsByJobIdAndStudentId(
            Long jobId,
            Long studentId
    );

    List<JobApplication> findByStudentIdOrderByAppliedAtDesc(
            Long studentId
    );

    List<JobApplication> findByJobIdOrderByAppliedAtDesc(
            Long jobId
    );

    long countByStatus(ApplicationStatus status);

    List<JobApplication> findByStatusOrderByUpdatedAtDesc(
            ApplicationStatus status
    );

    long countByJobRecruiterId(Long recruiterId);

    long countByJobRecruiterIdAndStatus(
            Long recruiterId,
            ApplicationStatus status
    );

    Page<JobApplication> findByJobId(
            Long jobId,
            Pageable pageable
    );

    Page<JobApplication> findByStudentId(
            Long studentId,
            Pageable pageable
    );

    @Query("""
        SELECT DISTINCT a
        FROM JobApplication a
        JOIN a.job j
        JOIN a.student s
        JOIN s.user u
        WHERE LOWER(j.recruiter.user.email) = LOWER(:recruiterEmail)

        AND (
            :keyword IS NULL
            OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :keyword, '%'))
            OR LOWER(u.email) LIKE LOWER(CONCAT('%', :keyword, '%'))
            OR LOWER(j.title) LIKE LOWER(CONCAT('%', :keyword, '%'))
            OR EXISTS (
                SELECT 1
                FROM StudentSkill ss
                JOIN ss.skill sk
                WHERE ss.student.id = s.id
                AND LOWER(sk.name)
                    LIKE LOWER(CONCAT('%', :keyword, '%'))
            )
        )

        AND (
            :minimumCgpa IS NULL
            OR s.cgpa >= :minimumCgpa
        )

        AND (
            :graduationYear IS NULL
            OR s.graduationYear = :graduationYear
        )

        AND (
            :status IS NULL
            OR a.status = :status
        )

        AND (
            :jobId IS NULL
            OR j.id = :jobId
        )
    """)
    Page<JobApplication> searchRecruiterCandidates(
            @Param("recruiterEmail") String recruiterEmail,
            @Param("keyword") String keyword,
            @Param("minimumCgpa") Double minimumCgpa,
            @Param("graduationYear") Integer graduationYear,
            @Param("status") ApplicationStatus status,
            @Param("jobId") Long jobId,
            Pageable pageable
    );
}