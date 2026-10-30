package com.placement.career.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "job_bookmarks",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_student_job_bookmark",
                        columnNames = {"student_id", "job_id"}
                )
        }
)
public class JobBookmark {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id", nullable = false)
    private StudentProfile student;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "job_id", nullable = false)
    private Job job;

    @Column(nullable = false)
    private LocalDateTime bookmarkedAt;

    @PrePersist
    protected void onCreate() {
        bookmarkedAt = LocalDateTime.now();
    }

    public JobBookmark() {
    }

    public JobBookmark(StudentProfile student, Job job) {
        this.student = student;
        this.job = job;
    }

    public Long getId() {
        return id;
    }

    public StudentProfile getStudent() {
        return student;
    }

    public Job getJob() {
        return job;
    }

    public LocalDateTime getBookmarkedAt() {
        return bookmarkedAt;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public void setStudent(StudentProfile student) {
        this.student = student;
    }

    public void setJob(Job job) {
        this.job = job;
    }

    public void setBookmarkedAt(LocalDateTime bookmarkedAt) {
        this.bookmarkedAt = bookmarkedAt;
    }
}