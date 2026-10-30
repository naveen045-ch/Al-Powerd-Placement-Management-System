package com.placement.career.controller;

import com.placement.career.dto.ResumeResponse;
import com.placement.career.service.ResumeService;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;

@RestController
@RequestMapping("/api/students/me/resume")
@PreAuthorize("hasRole('STUDENT')")
public class ResumeController {

    private final ResumeService resumeService;

    public ResumeController(ResumeService resumeService) {
        this.resumeService = resumeService;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResumeResponse uploadResume(
            Authentication authentication,
            @RequestParam("file") MultipartFile file) {

        return resumeService.uploadResume(
                authentication.getName(),
                file
        );
    }

    @GetMapping
    public ResumeResponse getMyResume(
            Authentication authentication) {

        return resumeService.getMyResume(
                authentication.getName()
        );
    }
    @GetMapping("/download")
    public ResponseEntity<byte[]> downloadResume(
            Authentication authentication) {

        ResumeResponse resume = resumeService.getMyResume(
                authentication.getName()
        );

        byte[] fileBytes = resumeService.downloadResumeBytes(
                authentication.getName()
        );

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(resume.contentType()))
                .contentLength(fileBytes.length)
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + resume.originalFileName() + "\""
                )
                .body(fileBytes);
    }
    @DeleteMapping
    public ResponseEntity<Void> deleteResume(
            Authentication authentication) {

        resumeService.deleteResume(
                authentication.getName()
        );

        return ResponseEntity.noContent().build();
    }
}