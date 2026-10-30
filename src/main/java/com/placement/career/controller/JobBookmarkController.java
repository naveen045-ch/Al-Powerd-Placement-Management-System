package com.placement.career.controller;

import com.placement.career.dto.JobBookmarkResponse;
import com.placement.career.service.JobBookmarkService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/students/me/bookmarks")
@PreAuthorize("hasRole('STUDENT')")
public class JobBookmarkController {

    private final JobBookmarkService bookmarkService;

    public JobBookmarkController(JobBookmarkService bookmarkService) {
        this.bookmarkService = bookmarkService;
    }

    @PostMapping("/{jobId}")
    public JobBookmarkResponse bookmarkJob(
            Authentication authentication,
            @PathVariable Long jobId) {

        return bookmarkService.bookmarkJob(
                authentication.getName(),
                jobId);
    }

    @GetMapping
    public Page<JobBookmarkResponse> getMyBookmarks(
            Authentication authentication,
            @ParameterObject
            @PageableDefault(
                    size = 10,
                    sort = "bookmarkedAt",
                    direction = Sort.Direction.DESC
            )
            Pageable pageable) {

        return bookmarkService.getMyBookmarks(
                authentication.getName(),
                pageable);
    }

    @DeleteMapping("/{jobId}")
    public ResponseEntity<Void> removeBookmark(
            Authentication authentication,
            @PathVariable Long jobId) {

        bookmarkService.removeBookmark(
                authentication.getName(),
                jobId);

        return ResponseEntity.noContent().build();
    }
}