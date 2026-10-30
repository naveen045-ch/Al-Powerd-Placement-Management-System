package com.placement.career.service;

import com.placement.career.dto.ResumeResponse;
import com.placement.career.entity.Resume;
import com.placement.career.entity.StudentProfile;
import com.placement.career.entity.User;
import com.placement.career.exception.ResourceNotFoundException;
import com.placement.career.repository.ResumeRepository;
import com.placement.career.repository.StudentProfileRepository;
import com.placement.career.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.net.MalformedURLException;
import java.nio.file.Files;

import java.io.IOException;
import java.nio.file.*;
import java.util.UUID;

@Service
public class ResumeService {

    private final ResumeRepository resumeRepository;
    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;

    @Value("${app.resume.upload-dir:uploads/resumes}")
    private String uploadDirectory;

    public ResumeService(
            ResumeRepository resumeRepository,
            UserRepository userRepository,
            StudentProfileRepository studentProfileRepository) {

        this.resumeRepository = resumeRepository;
        this.userRepository = userRepository;
        this.studentProfileRepository = studentProfileRepository;
    }

    @Transactional
    public ResumeResponse uploadResume(
            String email,
            MultipartFile file) {

        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException(
                    "Resume file is required");
        }

        String contentType = file.getContentType();

        if (contentType == null ||
                (!contentType.equalsIgnoreCase("application/pdf")
                        && !contentType.equalsIgnoreCase(
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"))) {

            throw new IllegalArgumentException(
                    "Only PDF and DOCX files are allowed");
        }

        if (file.getSize() > 5 * 1024 * 1024) {
            throw new IllegalArgumentException(
                    "Resume file size must not exceed 5 MB");
        }

        User user = userRepository
                .findByEmailIgnoreCase(email)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "User not found"));

        StudentProfile student =
                studentProfileRepository
                        .findByUserId(user.getId())
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Student profile not found"));

        try {
            Path directory =
                    Paths.get(uploadDirectory)
                            .toAbsolutePath()
                            .normalize();

            Files.createDirectories(directory);

            Resume existingResume =
                    resumeRepository
                            .findByStudentId(student.getId())
                            .orElse(null);

            if (existingResume != null) {
                deletePhysicalFile(existingResume);
            }

            String originalFileName =
                    file.getOriginalFilename() != null
                            ? Paths.get(file.getOriginalFilename())
                            .getFileName()
                            .toString()
                            : "resume";

            String extension = "";

            int dotIndex = originalFileName.lastIndexOf('.');

            if (dotIndex >= 0) {
                extension =
                        originalFileName.substring(dotIndex);
            }

            String storedFileName =
                    UUID.randomUUID() + extension;

            Path target =
                    directory.resolve(storedFileName)
                            .normalize();

            if (!target.startsWith(directory)) {
                throw new IllegalArgumentException(
                        "Invalid file path");
            }

            Files.copy(
                    file.getInputStream(),
                    target,
                    StandardCopyOption.REPLACE_EXISTING
            );

            Resume resume;

            if (existingResume != null) {
                resume = existingResume;
            } else {
                resume = new Resume();
                resume.setStudent(student);
            }

            resume.setOriginalFileName(originalFileName);
            resume.setStoredFileName(storedFileName);
            resume.setContentType(contentType);
            resume.setFileSize(file.getSize());

            Resume saved =
                    resumeRepository.save(resume);

            return toResponse(saved);

        } catch (IOException e) {

            throw new RuntimeException(
                    "Failed to store resume file",
                    e);
        }
    }

    @Transactional(readOnly = true)
    public ResumeResponse getMyResume(String email) {

        StudentProfile student =
                getStudent(email);

        Resume resume =
                resumeRepository
                        .findByStudentId(student.getId())
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Resume not found"));

        return toResponse(resume);
    }

    private StudentProfile getStudent(String email) {

        User user = userRepository
                .findByEmailIgnoreCase(email)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "User not found"));

        return studentProfileRepository
                .findByUserId(user.getId())
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Student profile not found"));
    }

    private void deletePhysicalFile(
            Resume resume) {

        try {

            Path directory =
                    Paths.get(uploadDirectory)
                            .toAbsolutePath()
                            .normalize();

            Path file =
                    directory
                            .resolve(resume.getStoredFileName())
                            .normalize();

            if (file.startsWith(directory)) {
                Files.deleteIfExists(file);
            }

        } catch (IOException e) {

            throw new RuntimeException(
                    "Failed to delete old resume",
                    e);
        }
    }

    private ResumeResponse toResponse(
            Resume resume) {

        return new ResumeResponse(
                resume.getId(),
                resume.getOriginalFileName(),
                resume.getContentType(),
                resume.getFileSize(),
                resume.getUploadedAt(),
                resume.getUpdatedAt()
        );
    }
    public Resource downloadResume(String email) {

        Resume resume = resumeRepository.findByStudentId(
                getStudent(email).getId()
        ).orElseThrow(() ->
                new RuntimeException("Resume not found")
        );

        try {
            Path filePath = Paths.get(uploadDirectory)
                    .toAbsolutePath()
                    .normalize()
                    .resolve(resume.getStoredFileName())
                    .normalize();

            if (!filePath.startsWith(
                    Paths.get(uploadDirectory).toAbsolutePath().normalize())) {
                throw new RuntimeException("Invalid file path");
            }

            Resource resource = new UrlResource(filePath.toUri());

            if (!resource.exists() || !resource.isReadable()) {
                throw new RuntimeException("Resume file not found");
            }

            return resource;

        } catch (MalformedURLException e) {
            throw new RuntimeException("Could not read resume file", e);
        }
    }
    public byte[] downloadResumeBytes(String email) {

        Resume resume = resumeRepository.findByStudentId(
                getStudent(email).getId()
        ).orElseThrow(() ->
                new RuntimeException("Resume not found")
        );

        try {
            Path filePath = Paths.get(uploadDirectory)
                    .toAbsolutePath()
                    .normalize()
                    .resolve(resume.getStoredFileName())
                    .normalize();

            if (!filePath.startsWith(
                    Paths.get(uploadDirectory).toAbsolutePath().normalize())) {
                throw new RuntimeException("Invalid file path");
            }

            if (!Files.exists(filePath) || !Files.isReadable(filePath)) {
                throw new RuntimeException("Resume file not found");
            }

            return Files.readAllBytes(filePath);

        } catch (IOException e) {
            throw new RuntimeException("Could not read resume file", e);
        }
    }
    public void deleteResume(String email) {

        Resume resume = resumeRepository.findByStudentId(
                getStudent(email).getId()
        ).orElseThrow(() ->
                new RuntimeException("Resume not found")
        );

        deletePhysicalFile(resume);

        resumeRepository.delete(resume);
    }
}