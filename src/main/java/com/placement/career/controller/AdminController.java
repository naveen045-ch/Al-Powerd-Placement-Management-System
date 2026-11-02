package com.placement.career.controller;

import com.placement.career.dto.AdminCreateUserRequest;
import com.placement.career.dto.AdminUserResponse;
import com.placement.career.dto.AdminDashboardResponse;
import com.placement.career.dto.UserStatusRequest;
import com.placement.career.dto.UserRoleRequest;
import com.placement.career.service.AdminService;

import jakarta.validation.Valid;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    // CREATE ACCOUNT
    @PostMapping("/users")
    public AdminUserResponse createUser(
            @Valid @RequestBody AdminCreateUserRequest request
    ) {
        return adminService.createUser(request);
    }

    // GET ALL USERS
    @GetMapping("/users")
    public List<AdminUserResponse> getAllUsers() {
        return adminService.getAllUsers();
    }

    // UPDATE USER STATUS
    @PatchMapping("/users/{userId}/status")
    public AdminUserResponse updateUserStatus(
            @PathVariable Long userId,
            @Valid @RequestBody UserStatusRequest request
    ) {
        return adminService.updateUserStatus(userId, request);
    }

    // GET STUDENTS
    @GetMapping("/users/students")
    public List<AdminUserResponse> getStudents() {
        return adminService.getStudents();
    }

    // GET RECRUITERS
    @GetMapping("/users/recruiters")
    public List<AdminUserResponse> getRecruiters() {
        return adminService.getRecruiters();
    }

    // GET PLACEMENT OFFICERS
    @GetMapping("/users/officers")
    public List<AdminUserResponse> getPlacementOfficers() {
        return adminService.getPlacementOfficers();
    }

    // ADMIN DASHBOARD
    @GetMapping("/dashboard")
    public AdminDashboardResponse getDashboard() {
        return adminService.getDashboard();
    }

    // UPDATE USER ROLE
    @PatchMapping("/users/{userId}/role")
    public AdminUserResponse updateUserRole(
            @PathVariable Long userId,
            @Valid @RequestBody UserRoleRequest request
    ) {
        return adminService.updateUserRole(userId, request);
    }
}