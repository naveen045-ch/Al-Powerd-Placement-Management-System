package com.placement.career.controller;

import com.placement.career.dto.StudentProfileResponse;
import com.placement.career.service.StudentProfileService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.placement.career.dto.StudentProfileUpdateRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import com.placement.career.dto.StudentAccountUpdateRequest;
import org.springframework.http.ResponseEntity;
import com.placement.career.dto.ChangePasswordRequest;

@RestController
@RequestMapping("/api/students/me/profile")
@PreAuthorize("hasRole('STUDENT')")
public class StudentProfileController {

    private final StudentProfileService studentProfileService;

    public StudentProfileController(
            StudentProfileService studentProfileService
    ) {
        this.studentProfileService = studentProfileService;
    }

    @GetMapping
    public StudentProfileResponse getMyProfile(
            Authentication authentication
    ) {
        return studentProfileService.getMyProfile(
                authentication.getName()
        );
    }
    @PutMapping
    public StudentProfileResponse updateMyProfile(
            Authentication authentication,
            @Valid @RequestBody StudentProfileUpdateRequest request
    ) {
        return studentProfileService.updateMyProfile(
                authentication.getName(),
                request
        );
    }
    @PutMapping("/account")
    public StudentProfileResponse updateMyAccount(
            Authentication authentication,
            @Valid @RequestBody StudentAccountUpdateRequest request
    ) {
        return studentProfileService.updateMyAccount(
                authentication.getName(),
                request
        );
    }
    @PutMapping("/password")
    public ResponseEntity<Void> changePassword(
            Authentication authentication,
            @Valid @RequestBody ChangePasswordRequest request
    ) {
        studentProfileService.changePassword(
                authentication.getName(),
                request
        );

        return ResponseEntity.noContent().build();
    }
}
