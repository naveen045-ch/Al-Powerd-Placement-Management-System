package com.placement.career.controller;

import com.placement.career.dto.AdminUserResponse;
import com.placement.career.service.AdminService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.placement.career.dto.UserStatusRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import com.placement.career.dto.AdminDashboardResponse;
import com.placement.career.dto.UserRoleRequest;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    @GetMapping("/users")
    public List<AdminUserResponse> getAllUsers() {
        return adminService.getAllUsers();
    }
    @PatchMapping("/users/{userId}/status")
    public AdminUserResponse updateUserStatus(
            @PathVariable Long userId,
            @Valid @RequestBody UserStatusRequest request
    ) {
        return adminService.updateUserStatus(userId, request);
    }
    @GetMapping("/users/students")
    public List<AdminUserResponse> getStudents() {
        return adminService.getStudents();
    }

    @GetMapping("/users/recruiters")
    public List<AdminUserResponse> getRecruiters() {
        return adminService.getRecruiters();
    }

    @GetMapping("/users/officers")
    public List<AdminUserResponse> getPlacementOfficers() {
        return adminService.getPlacementOfficers();
    }
    @GetMapping("/dashboard")
    public AdminDashboardResponse getDashboard() {
        return adminService.getDashboard();
    }
    @PatchMapping("/users/{userId}/role")
    public AdminUserResponse updateUserRole(
            @PathVariable Long userId,
            @Valid @RequestBody UserRoleRequest request
    ) {
        return adminService.updateUserRole(userId, request);
    }
}