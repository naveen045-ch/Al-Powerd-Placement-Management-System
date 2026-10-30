package com.placement.career.service;

import com.placement.career.dto.RecruiterCandidateResponse;
import com.placement.career.entity.ApplicationStatus;
import com.placement.career.entity.JobApplication;
import com.placement.career.entity.StudentSkill;
import com.placement.career.repository.JobApplicationRepository;
import com.placement.career.repository.StudentSkillRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class RecruiterCandidateService {

    private final JobApplicationRepository applicationRepository;
    private final StudentSkillRepository studentSkillRepository;

    public RecruiterCandidateService(
            JobApplicationRepository applicationRepository,
            StudentSkillRepository studentSkillRepository) {

        this.applicationRepository = applicationRepository;
        this.studentSkillRepository = studentSkillRepository;
    }

    @Transactional(readOnly = true)
    public Page<RecruiterCandidateResponse> searchCandidates(
            String recruiterEmail,
            String keyword,
            Double minimumCgpa,
            Integer graduationYear,
            ApplicationStatus status,
            Long jobId,
            Pageable pageable) {

        if (keyword != null && keyword.isBlank()) {
            keyword = null;
        }

        return applicationRepository
                .searchRecruiterCandidates(
                        recruiterEmail,
                        keyword,
                        minimumCgpa,
                        graduationYear,
                        status,
                        jobId,
                        pageable
                )
                .map(this::toResponse);
    }

    private RecruiterCandidateResponse toResponse(
            JobApplication application) {

        List<String> skills =
                studentSkillRepository
                        .findByStudentId(
                                application.getStudent().getId()
                        )
                        .stream()
                        .map(StudentSkill::getSkill)
                        .map(skill -> skill.getName())
                        .toList();

        return new RecruiterCandidateResponse(

                application.getId(),

                application.getStudent().getId(),

                application.getStudent()
                        .getUser()
                        .getFullName(),

                application.getStudent()
                        .getUser()
                        .getEmail(),

                application.getStudent()
                        .getCgpa(),

                application.getStudent()
                        .getGraduationYear(),

                skills,

                application.getJob().getId(),

                application.getJob().getTitle(),

                application.getStatus(),

                application.getAppliedAt(),

                application.getUpdatedAt(),

                application.getRecruiterNote()
        );
    }
}