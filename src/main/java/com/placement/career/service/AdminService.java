package com.placement.career.service;

import com.placement.career.dto.AdminUserResponse;
import com.placement.career.entity.User;
import com.placement.career.repository.UserRepository;
import org.springframework.stereotype.Service;
import com.placement.career.dto.UserStatusRequest;
import com.placement.career.entity.RoleName;
import com.placement.career.dto.*;
import java.util.stream.Collectors;
import com.placement.career.dto.UserRoleRequest;
import com.placement.career.entity.Role;
import com.placement.career.repository.RoleRepository;


import java.util.List;

@Service
public class AdminService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;

    public AdminService(
            UserRepository userRepository,
            RoleRepository roleRepository
    ) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
    }

    public List<AdminUserResponse> getAllUsers() {

        return userRepository.findAll()
                .stream()
                .map(user -> new AdminUserResponse(
                        user.getId(),
                        user.getFullName(),
                        user.getEmail(),
                        user.getPhone(),
                        user.isEnabled(),
                        user.getRoles()
                                .stream()
                                .map(role -> role.getName())
                                .collect(Collectors.toSet()),
                        user.getCreatedAt(),
                        user.getUpdatedAt()
                ))
                .toList();
    }
    public AdminUserResponse updateUserStatus(
            Long userId,
            UserStatusRequest request
    ) {

        User user = userRepository.findById(userId)
                .orElseThrow(() ->
                        new RuntimeException("User not found"));

        user.setEnabled(request.enabled());

        User updatedUser = userRepository.save(user);

        return new AdminUserResponse(
                updatedUser.getId(),
                updatedUser.getFullName(),
                updatedUser.getEmail(),
                updatedUser.getPhone(),
                updatedUser.isEnabled(),
                updatedUser.getRoles()
                        .stream()
                        .map(role -> role.getName())
                        .collect(Collectors.toSet()),
                updatedUser.getCreatedAt(),
                updatedUser.getUpdatedAt()
        );
    }
    public List<AdminUserResponse> getUsersByRole(RoleName roleName) {

        return userRepository.findDistinctByRolesName(roleName)
                .stream()
                .map(user -> new AdminUserResponse(
                        user.getId(),
                        user.getFullName(),
                        user.getEmail(),
                        user.getPhone(),
                        user.isEnabled(),
                        user.getRoles()
                                .stream()
                                .map(role -> role.getName())
                                .collect(Collectors.toSet()),
                        user.getCreatedAt(),
                        user.getUpdatedAt()
                ))
                .toList();
    }

    public List<AdminUserResponse> getStudents() {
        return getUsersByRole(RoleName.STUDENT);
    }

    public List<AdminUserResponse> getRecruiters() {
        return getUsersByRole(RoleName.RECRUITER);
    }

    public List<AdminUserResponse> getPlacementOfficers() {
        return getUsersByRole(RoleName.PLACEMENT_OFFICER);
    }
    public AdminDashboardResponse getDashboard() {

        long totalUsers = userRepository.count();

        long totalStudents =
                userRepository.findDistinctByRolesName(RoleName.STUDENT).size();

        long totalRecruiters =
                userRepository.findDistinctByRolesName(RoleName.RECRUITER).size();

        long totalPlacementOfficers =
                userRepository.findDistinctByRolesName(RoleName.PLACEMENT_OFFICER).size();

        long totalAdmins =
                userRepository.findDistinctByRolesName(RoleName.ADMIN).size();

        long enabledUsers =
                userRepository.findAll()
                        .stream()
                        .filter(User::isEnabled)
                        .count();

        long disabledUsers =
                userRepository.findAll()
                        .stream()
                        .filter(user -> !user.isEnabled())
                        .count();

        return new AdminDashboardResponse(
                totalUsers,
                totalStudents,
                totalRecruiters,
                totalPlacementOfficers,
                totalAdmins,
                enabledUsers,
                disabledUsers
        );
    }
    public AdminUserResponse updateUserRole(
            Long userId,
            UserRoleRequest request
    ) {

        User user = userRepository.findById(userId)
                .orElseThrow(() ->
                        new RuntimeException("User not found"));

        Role role = roleRepository.findByName(request.role())
                .orElseThrow(() ->
                        new RuntimeException("Role not found"));

        user.getRoles().clear();
        user.getRoles().add(role);

        User updatedUser = userRepository.save(user);

        return new AdminUserResponse(
                updatedUser.getId(),
                updatedUser.getFullName(),
                updatedUser.getEmail(),
                updatedUser.getPhone(),
                updatedUser.isEnabled(),
                updatedUser.getRoles()
                        .stream()
                        .map(r -> r.getName())
                        .collect(Collectors.toSet()),
                updatedUser.getCreatedAt(),
                updatedUser.getUpdatedAt()
        );
    }
}
