package com.placement.career.service;

import com.placement.career.dto.JobCreateRequest;
import com.placement.career.dto.JobResponse;
import com.placement.career.dto.SkillResponse;
import com.placement.career.entity.Job;
import com.placement.career.entity.RecruiterProfile;
import com.placement.career.entity.Skill;
import com.placement.career.entity.User;
import com.placement.career.exception.ResourceNotFoundException;
import com.placement.career.repository.JobRepository;
import com.placement.career.repository.RecruiterProfileRepository;
import com.placement.career.repository.SkillRepository;
import com.placement.career.repository.UserRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import com.placement.career.entity.JobType;



import java.time.LocalDateTime;
import java.util.List;

@Service
public class JobService {

    private final JobRepository jobRepository;
    private final SkillRepository skillRepository;
    private final RecruiterProfileRepository recruiterProfileRepository;
    private final UserRepository userRepository;


    public JobService(
            JobRepository jobRepository,
            SkillRepository skillRepository,
            RecruiterProfileRepository recruiterProfileRepository,
            UserRepository userRepository) {

        this.jobRepository = jobRepository;
        this.skillRepository = skillRepository;
        this.recruiterProfileRepository = recruiterProfileRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public JobResponse createJob(
            String email,
            JobCreateRequest request) {

        User user = userRepository
                .findByEmailIgnoreCase(email)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "User not found"));

        RecruiterProfile recruiter =
                recruiterProfileRepository.findAll()
                        .stream()
                        .filter(r ->
                                r.getUser()
                                        .getId()
                                        .equals(user.getId()))
                        .findFirst()
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Recruiter profile not found"));

        if (recruiter.getCompany() == null) {
            throw new IllegalArgumentException(
                    "Recruiter is not associated with a company");
        }

        if (request.salaryMin() != null
                && request.salaryMax() != null
                && request.salaryMin() > request.salaryMax()) {

            throw new IllegalArgumentException(
                    "Minimum salary cannot exceed maximum salary");
        }

        if (request.applicationDeadline()
                .isBefore(LocalDateTime.now())) {

            throw new IllegalArgumentException(
                    "Application deadline must be in the future");
        }

        List<Skill> skills =
                skillRepository.findAllById(
                        request.requiredSkillIds());

        if (skills.size()
                != request.requiredSkillIds()
                .stream()
                .distinct()
                .count()) {

            throw new IllegalArgumentException(
                    "One or more skills do not exist");
        }

        Job job = new Job();

        job.setRecruiter(recruiter);
        job.setCompany(recruiter.getCompany());

        job.setTitle(request.title().trim());
        job.setDescription(request.description());
        job.setLocation(request.location().trim());

        job.setJobType(request.jobType());

        job.setSalaryMin(request.salaryMin());
        job.setSalaryMax(request.salaryMax());

        job.setMinimumCgpa(request.minimumCgpa());
        job.setGraduationYear(request.graduationYear());

        job.setApplicationDeadline(
                request.applicationDeadline());

        job.setRequiredSkills(skills);

        return toResponse(
                jobRepository.save(job));
    }

    public List<JobResponse> getAllActiveJobs() {

        return jobRepository
                .findByActiveTrueOrderByCreatedAtDesc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public JobResponse getJob(Long id) {

        Job job = jobRepository
                .findById(id)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Job not found"));

        return toResponse(job);
    }

    @Transactional
    public JobResponse updateJob(
            String email,
            Long id,
            JobCreateRequest request) {

        Job job = jobRepository
                .findById(id)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Job not found"));

        checkOwnership(job, email);
        if (request.salaryMin() != null
                && request.salaryMax() != null
                && request.salaryMin() > request.salaryMax()) {

            throw new IllegalArgumentException(
                    "Minimum salary cannot exceed maximum salary");
        }

        if (request.applicationDeadline()
                .isBefore(LocalDateTime.now())) {

            throw new IllegalArgumentException(
                    "Application deadline must be in the future");
        }

        List<Skill> skills =
                skillRepository.findAllById(
                        request.requiredSkillIds());

        if (skills.size()
                != request.requiredSkillIds()
                .stream()
                .distinct()
                .count()) {

            throw new IllegalArgumentException(
                    "One or more skills do not exist");
        }

        job.setTitle(request.title().trim());
        job.setDescription(request.description());
        job.setLocation(request.location().trim());
        job.setJobType(request.jobType());

        job.setSalaryMin(request.salaryMin());
        job.setSalaryMax(request.salaryMax());

        job.setMinimumCgpa(request.minimumCgpa());
        job.setGraduationYear(request.graduationYear());

        job.setApplicationDeadline(
                request.applicationDeadline());

        job.setRequiredSkills(skills);

        return toResponse(
                jobRepository.save(job));
    }

    @Transactional
    public void deactivateJob(
            String email,
            Long id) {

        Job job = jobRepository
                .findById(id)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Job not found"));

        checkOwnership(job, email);

        job.setActive(false);

        jobRepository.save(job);
    }

    private void checkOwnership(
            Job job,
            String email) {

        if (!job.getRecruiter()
                .getUser()
                .getEmail()
                .equalsIgnoreCase(email)) {

            throw new AccessDeniedException(
                    "You are not allowed to modify this job");
        }
    }

    private JobResponse toResponse(Job job) {

        List<SkillResponse> skills =
                job.getRequiredSkills()
                        .stream()
                        .map(skill ->
                                new SkillResponse(
                                        skill.getId(),
                                        skill.getName(),
                                        skill.getCategory()))
                        .toList();

        return new JobResponse(
                job.getId(),
                job.getCompany().getId(),
                job.getCompany().getName(),
                job.getRecruiter().getId(),
                job.getTitle(),
                job.getDescription(),
                job.getLocation(),
                job.getJobType(),
                job.getSalaryMin(),
                job.getSalaryMax(),
                job.getMinimumCgpa(),
                job.getGraduationYear(),
                job.getApplicationDeadline(),
                job.isActive(),
                skills,
                job.getCreatedAt()
        );
    }
    @Transactional(readOnly = true)
    public List<JobResponse> getMyJobs(String email) {

        User user = userRepository
                .findByEmailIgnoreCase(email)
                .orElseThrow(() ->
                        new ResourceNotFoundException("User not found"));

        RecruiterProfile recruiter =
                recruiterProfileRepository
                        .findByUserId(user.getId())
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Recruiter profile not found"
                                ));

        return jobRepository
                .findByRecruiterIdOrderByCreatedAtDesc(recruiter.getId())
                .stream()
                .map(this::toResponse)
                .toList();
    }
    @Transactional(readOnly = true)
    public Page<JobResponse> getAllActiveJobs(Pageable pageable) {

        return jobRepository
                .findByActiveTrue(pageable)
                .map(this::toResponse);
    }
    @Transactional(readOnly = true)
    public Page<JobResponse> getMyJobs(
            String email,
            Pageable pageable) {

        User user = userRepository
                .findByEmailIgnoreCase(email)
                .orElseThrow(() ->
                        new ResourceNotFoundException("User not found"));

        RecruiterProfile recruiter =
                recruiterProfileRepository
                        .findByUserId(user.getId())
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Recruiter profile not found"
                                ));

        return jobRepository
                .findByRecruiterId(recruiter.getId(), pageable)
                .map(this::toResponse);
    }
    @Transactional(readOnly = true)
    public Page<JobResponse> searchJobs(
            String keyword,
            String location,
            JobType jobType,
            Double minimumCgpa,
            Integer graduationYear,
            Pageable pageable) {

        if (keyword != null && keyword.isBlank()) {
            keyword = null;
        }

        if (location != null && location.isBlank()) {
            location = null;
        }

        return jobRepository
                .searchActiveJobs(
                        keyword,
                        location,
                        jobType,
                        minimumCgpa,
                        graduationYear,
                        pageable)
                .map(this::toResponse);
    }
}