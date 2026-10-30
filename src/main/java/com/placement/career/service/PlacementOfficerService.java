package com.placement.career.service;

import com.placement.career.dto.*;
import com.placement.career.entity.ApplicationStatus;
import com.placement.career.repository.CompanyRepository;
import com.placement.career.repository.InterviewRepository;
import com.placement.career.repository.JobApplicationRepository;
import com.placement.career.repository.JobRepository;
import com.placement.career.repository.StudentProfileRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PlacementOfficerService {

    private final StudentProfileRepository studentProfileRepository;
    private final CompanyRepository companyRepository;
    private final JobRepository jobRepository;
    private final JobApplicationRepository jobApplicationRepository;
    private final InterviewRepository interviewRepository;

    public PlacementOfficerService(
            StudentProfileRepository studentProfileRepository,
            CompanyRepository companyRepository,
            JobRepository jobRepository,
            JobApplicationRepository jobApplicationRepository,
            InterviewRepository interviewRepository
    ) {
        this.studentProfileRepository = studentProfileRepository;
        this.companyRepository = companyRepository;
        this.jobRepository = jobRepository;
        this.jobApplicationRepository = jobApplicationRepository;
        this.interviewRepository = interviewRepository;
    }

    public PlacementOfficerDashboardResponse getDashboard() {

        long totalStudents =
                studentProfileRepository.count();

        long totalCompanies =
                companyRepository.count();

        long totalJobs =
                jobRepository.count();

        long totalApplications =
                jobApplicationRepository.count();

        long totalSelected =
                jobApplicationRepository
                        .countByStatus(ApplicationStatus.SELECTED);

        long totalRejected =
                jobApplicationRepository
                        .countByStatus(ApplicationStatus.REJECTED);

        long totalInterviews =
                interviewRepository.count();

        return new PlacementOfficerDashboardResponse(
                totalStudents,
                totalCompanies,
                totalJobs,
                totalApplications,
                totalSelected,
                totalRejected,
                totalInterviews
        );
    }
    public List<PlacementStudentResponse> getAllStudents() {

        return studentProfileRepository.findAll()
                .stream()
                .map(student -> new PlacementStudentResponse(
                        student.getId(),
                        student.getUser().getFullName(),
                        student.getUser().getEmail(),
                        student.getUser().getPhone(),
                        student.getCollege(),
                        student.getBranch(),
                        student.getGraduationYear(),
                        student.getCgpa()
                ))
                .toList();
    }
    public List<PlacementCompanyResponse> getAllCompanies() {

        return companyRepository.findAll()
                .stream()
                .map(company -> new PlacementCompanyResponse(
                        company.getId(),
                        company.getName(),
                        company.getIndustry(),
                        company.getWebsite(),
                        company.getLocation()
                ))
                .toList();
    }
    public List<PlacementJobResponse> getAllJobs() {

        return jobRepository.findAll()
                .stream()
                .map(job -> new PlacementJobResponse(
                        job.getId(),
                        job.getTitle(),
                        job.getCompany().getName(),
                        job.getLocation(),
                        job.getJobType().name(),
                        job.getSalaryMin(),
                        job.getSalaryMax(),
                        job.getMinimumCgpa(),
                        job.getGraduationYear(),
                        job.getApplicationDeadline(),
                        job.isActive(),
                        job.getCreatedAt()
                ))
                .toList();
    }
    public List<PlacementApplicationResponse> getAllApplications() {

        return jobApplicationRepository.findAll()
                .stream()
                .map(application -> new PlacementApplicationResponse(
                        application.getId(),

                        application.getStudent().getId(),
                        application.getStudent().getUser().getFullName(),
                        application.getStudent().getUser().getEmail(),

                        application.getJob().getId(),
                        application.getJob().getTitle(),

                        application.getJob().getCompany().getId(),
                        application.getJob().getCompany().getName(),

                        application.getStatus(),

                        application.getAppliedAt(),
                        application.getUpdatedAt(),

                        application.getRecruiterNote()
                ))
                .toList();
    }
    public List<SelectedStudentResponse> getSelectedStudents() {

        return jobApplicationRepository
                .findByStatusOrderByUpdatedAtDesc(ApplicationStatus.SELECTED)
                .stream()
                .map(application -> new SelectedStudentResponse(
                        application.getId(),

                        application.getStudent().getId(),
                        application.getStudent().getUser().getFullName(),
                        application.getStudent().getUser().getEmail(),

                        application.getJob().getId(),
                        application.getJob().getTitle(),

                        application.getJob().getCompany().getId(),
                        application.getJob().getCompany().getName()
                ))
                .toList();
    }
    public PlacementStatisticsResponse getPlacementStatistics() {

        long totalStudents =
                studentProfileRepository.count();

        long totalCompanies =
                companyRepository.count();

        long totalJobs =
                jobRepository.count();

        long totalApplications =
                jobApplicationRepository.count();

        long totalApplied =
                jobApplicationRepository
                        .countByStatus(ApplicationStatus.APPLIED);

        long totalUnderReview =
                jobApplicationRepository
                        .countByStatus(ApplicationStatus.UNDER_REVIEW);

        long totalShortlisted =
                jobApplicationRepository
                        .countByStatus(ApplicationStatus.SHORTLISTED);

        long totalInterviews =
                jobApplicationRepository
                        .countByStatus(ApplicationStatus.INTERVIEW);

        long totalSelected =
                jobApplicationRepository
                        .countByStatus(ApplicationStatus.SELECTED);

        long totalRejected =
                jobApplicationRepository
                        .countByStatus(ApplicationStatus.REJECTED);

        return new PlacementStatisticsResponse(
                totalStudents,
                totalCompanies,
                totalJobs,
                totalApplications,
                totalApplied,
                totalUnderReview,
                totalShortlisted,
                totalInterviews,
                totalSelected,
                totalRejected
        );
    }
}
