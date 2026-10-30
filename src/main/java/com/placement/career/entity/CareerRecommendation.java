package com.placement.career.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "career_recommendations")
public class CareerRecommendation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id", nullable = false)
    private User student;

    @Column(length = 100)
    private String targetRole;

    @Column(columnDefinition = "TEXT")
    private String recommendedRoles;

    @Column(columnDefinition = "TEXT")
    private String strengths;

    @Column(columnDefinition = "TEXT")
    private String skillGaps;

    @Column(columnDefinition = "TEXT")
    private String recommendedTechnologies;

    @Column(columnDefinition = "TEXT")
    private String learningRoadmap;

    @Column(columnDefinition = "TEXT")
    private String placementAdvice;

    @Column(columnDefinition = "TEXT")
    private String overallAssessment;

    @Column(nullable = false)
    private LocalDateTime generatedAt;

    @PrePersist
    protected void onCreate() {
        generatedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public User getStudent() {
        return student;
    }

    public void setStudent(User student) {
        this.student = student;
    }

    public String getTargetRole() {
        return targetRole;
    }

    public void setTargetRole(String targetRole) {
        this.targetRole = targetRole;
    }

    public String getRecommendedRoles() {
        return recommendedRoles;
    }

    public void setRecommendedRoles(String recommendedRoles) {
        this.recommendedRoles = recommendedRoles;
    }

    public String getStrengths() {
        return strengths;
    }

    public void setStrengths(String strengths) {
        this.strengths = strengths;
    }

    public String getSkillGaps() {
        return skillGaps;
    }

    public void setSkillGaps(String skillGaps) {
        this.skillGaps = skillGaps;
    }

    public String getRecommendedTechnologies() {
        return recommendedTechnologies;
    }

    public void setRecommendedTechnologies(String recommendedTechnologies) {
        this.recommendedTechnologies = recommendedTechnologies;
    }

    public String getLearningRoadmap() {
        return learningRoadmap;
    }

    public void setLearningRoadmap(String learningRoadmap) {
        this.learningRoadmap = learningRoadmap;
    }

    public String getPlacementAdvice() {
        return placementAdvice;
    }

    public void setPlacementAdvice(String placementAdvice) {
        this.placementAdvice = placementAdvice;
    }

    public String getOverallAssessment() {
        return overallAssessment;
    }

    public void setOverallAssessment(String overallAssessment) {
        this.overallAssessment = overallAssessment;
    }

    public LocalDateTime getGeneratedAt() {
        return generatedAt;
    }
}
