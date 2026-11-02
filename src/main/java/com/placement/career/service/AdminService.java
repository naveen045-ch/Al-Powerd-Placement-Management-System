package com.placement.career.service;

import com.placement.career.dto.*;
import com.placement.career.entity.*;
import com.placement.career.repository.*;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashSet;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class AdminService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final RecruiterProfileRepository recruiterProfileRepository;
    private final CompanyRepository companyRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminService(
            UserRepository userRepository,
            RoleRepository roleRepository,
            StudentProfileRepository studentProfileRepository,
            RecruiterProfileRepository recruiterProfileRepository,
            CompanyRepository companyRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.studentProfileRepository = studentProfileRepository;
        this.recruiterProfileRepository = recruiterProfileRepository;
        this.companyRepository = companyRepository;
        this.passwordEncoder = passwordEncoder;
    }

    // CREATE STUDENT / RECRUITER / PLACEMENT OFFICER

    @Transactional
    public AdminUserResponse createUser(AdminCreateUserRequest request) {

        if (request.role() == null ||
                request.role() == RoleName.ADMIN) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Only Student, Recruiter and Placement Officer accounts can be created here"
            );
        }

        String email = request.email().trim();

        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Email is already registered"
            );
        }

        Role role = roleRepository.findByName(request.role())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Role not found: " + request.role()
                ));

        User user = new User();
        user.setFullName(request.fullName().trim());
        user.setEmail(email);
        user.setPhone(
                request.phone() == null || request.phone().isBlank()
                        ? null
                        : request.phone().trim()
        );

        // Never save a raw password
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setEnabled(true);

        user.setRoles(new HashSet<>());
        user.getRoles().add(role);

        User savedUser = userRepository.save(user);

        // STUDENT PROFILE
        if (request.role() == RoleName.STUDENT) {

            StudentProfile profile = new StudentProfile();

            profile.setUser(savedUser);
            profile.setCollege(request.college());
            profile.setBranch(request.branch());
            profile.setSemester(request.semester());
            profile.setCgpa(request.cgpa());
            profile.setGraduationYear(request.graduationYear());

            studentProfileRepository.save(profile);
        }

        // RECRUITER PROFILE + COMPANY
        else if (request.role() == RoleName.RECRUITER) {

            if (request.companyName() == null ||
                    request.companyName().isBlank()) {

                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Company name is required for recruiter account"
                );
            }

            String companyName = request.companyName().trim();

            Company company = companyRepository
                    .findByNameIgnoreCase(companyName)
                    .orElseGet(() -> {

                        Company newCompany = new Company();
                        newCompany.setName(companyName);
                        newCompany.setIndustry(request.industry());
                        newCompany.setWebsite(request.website());
                        newCompany.setLocation(request.location());

                        return companyRepository.save(newCompany);
                    });

            RecruiterProfile profile = new RecruiterProfile();

            profile.setUser(savedUser);
            profile.setCompany(company);
            profile.setDesignation(request.designation());

            recruiterProfileRepository.save(profile);
        }

        // PLACEMENT OFFICER
        // No separate PlacementOfficerProfile entity was provided.
        // Therefore, only User + PLACEMENT_OFFICER role is created.

        return toResponse(savedUser);
    }

    // GET ALL USERS

    public List<AdminUserResponse> getAllUsers() {

        return userRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // UPDATE USER STATUS

    public AdminUserResponse updateUserStatus(
            Long userId,
            UserStatusRequest request
    ) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "User not found"
                ));

        user.setEnabled(request.enabled());

        User updatedUser = userRepository.save(user);

        return toResponse(updatedUser);
    }

    // GET USERS BY ROLE

    public List<AdminUserResponse> getUsersByRole(RoleName roleName) {

        return userRepository.findDistinctByRolesName(roleName)
                .stream()
                .map(this::toResponse)
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

    // ADMIN DASHBOARD

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

        long enabledUsers = userRepository.findAll()
                .stream()
                .filter(User::isEnabled)
                .count();

        long disabledUsers = userRepository.findAll()
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

    // UPDATE USER ROLE

    public AdminUserResponse updateUserRole(
            Long userId,
            UserRoleRequest request
    ) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "User not found"
                ));

        Role role = roleRepository.findByName(request.role())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Role not found"
                ));

        user.getRoles().clear();
        user.getRoles().add(role);

        User updatedUser = userRepository.save(user);

        return toResponse(updatedUser);
    }

    // COMMON RESPONSE MAPPER

    private AdminUserResponse toResponse(User user) {

        return new AdminUserResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getPhone(),
                user.isEnabled(),
                user.getRoles()
                        .stream()
                        .map(Role::getName)
                        .collect(Collectors.toSet()),
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }
}