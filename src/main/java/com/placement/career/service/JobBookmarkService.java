package com.placement.career.service;

import com.placement.career.dto.JobBookmarkResponse;
import com.placement.career.entity.Job;
import com.placement.career.entity.JobBookmark;
import com.placement.career.entity.StudentProfile;
import com.placement.career.entity.User;
import com.placement.career.repository.JobBookmarkRepository;
import com.placement.career.repository.JobRepository;
import com.placement.career.repository.StudentProfileRepository;
import com.placement.career.repository.UserRepository;
import com.placement.career.exception.ResourceNotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class JobBookmarkService {

    private final JobBookmarkRepository bookmarkRepository;
    private final JobRepository jobRepository;
    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;

    public JobBookmarkService(
            JobBookmarkRepository bookmarkRepository,
            JobRepository jobRepository,
            UserRepository userRepository,
            StudentProfileRepository studentProfileRepository) {

        this.bookmarkRepository = bookmarkRepository;
        this.jobRepository = jobRepository;
        this.userRepository = userRepository;
        this.studentProfileRepository = studentProfileRepository;
    }

    @Transactional
    public JobBookmarkResponse bookmarkJob(String email, Long jobId) {

        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() ->
                        new ResourceNotFoundException("User not found"));

        StudentProfile student = studentProfileRepository.findByUserId(user.getId())
                .orElseThrow(() ->
                        new ResourceNotFoundException("Student profile not found"));

        Job job = jobRepository.findById(jobId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Job not found"));

        if (!job.isActive()) {
            throw new IllegalArgumentException(
                    "Cannot bookmark an inactive job");
        }

        if (bookmarkRepository.existsByStudentIdAndJobId(
                student.getId(), jobId)) {

            throw new IllegalArgumentException(
                    "Job is already bookmarked");
        }

        JobBookmark bookmark = new JobBookmark(student, job);

        JobBookmark saved = bookmarkRepository.save(bookmark);

        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public Page<JobBookmarkResponse> getMyBookmarks(
            String email,
            Pageable pageable) {

        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() ->
                        new ResourceNotFoundException("User not found"));

        StudentProfile student = studentProfileRepository.findByUserId(user.getId())
                .orElseThrow(() ->
                        new ResourceNotFoundException("Student profile not found"));

        return bookmarkRepository
                .findByStudentIdOrderByBookmarkedAtDesc(
                        student.getId(),
                        pageable)
                .map(this::toResponse);
    }

    @Transactional
    public void removeBookmark(String email, Long jobId) {

        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() ->
                        new ResourceNotFoundException("User not found"));

        StudentProfile student = studentProfileRepository.findByUserId(user.getId())
                .orElseThrow(() ->
                        new ResourceNotFoundException("Student profile not found"));

        if (!bookmarkRepository.existsByStudentIdAndJobId(
                student.getId(), jobId)) {

            throw new ResourceNotFoundException(
                    "Bookmark not found");
        }

        bookmarkRepository.deleteByStudentIdAndJobId(
                student.getId(), jobId);
    }

    private JobBookmarkResponse toResponse(JobBookmark bookmark) {

        Job job = bookmark.getJob();

        return new JobBookmarkResponse(
                bookmark.getId(),
                job.getId(),
                job.getTitle(),
                job.getCompany().getId(),
                job.getCompany().getName(),
                job.getLocation(),
                job.getJobType().name(),
                job.getMinimumCgpa(),
                job.getGraduationYear(),
                job.getApplicationDeadline(),
                bookmark.getBookmarkedAt()
        );
    }
}