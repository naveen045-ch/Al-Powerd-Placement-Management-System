package com.placement.career.service;

import com.placement.career.dto.StudentProfileResponse;
import com.placement.career.entity.StudentProfile;
import com.placement.career.entity.User;
import com.placement.career.repository.StudentProfileRepository;
import com.placement.career.repository.UserRepository;
import org.springframework.stereotype.Service;
import com.placement.career.dto.StudentProfileUpdateRequest;
import org.springframework.transaction.annotation.Transactional;
import com.placement.career.dto.StudentAccountUpdateRequest;
import com.placement.career.dto.ChangePasswordRequest;
import org.springframework.security.crypto.password.PasswordEncoder;

@Service
public class StudentProfileService {

    private final StudentProfileRepository studentProfileRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public StudentProfileService(
            StudentProfileRepository studentProfileRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.studentProfileRepository = studentProfileRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public StudentProfileResponse getMyProfile(String email) {

        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() ->
                        new RuntimeException("User not found"));

        StudentProfile student = studentProfileRepository
                .findByUserId(user.getId())
                .orElseThrow(() ->
                        new RuntimeException("Student profile not found"));

        return new StudentProfileResponse(
                student.getId(),
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getPhone(),
                student.getCollege(),
                student.getBranch(),
                student.getSemester(),
                student.getCgpa(),
                student.getGraduationYear(),
                student.getGithubUrl(),
                student.getLinkedinUrl(),
                student.getBio()
        );
    }
    @Transactional
    public StudentProfileResponse updateMyProfile(
            String email,
            StudentProfileUpdateRequest request
    ) {

        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() ->
                        new RuntimeException("User not found"));

        StudentProfile student = studentProfileRepository
                .findByUserId(user.getId())
                .orElseThrow(() ->
                        new RuntimeException("Student profile not found"));

        student.setCollege(request.college());
        student.setBranch(request.branch());
        student.setSemester(request.semester());
        student.setCgpa(request.cgpa());
        student.setGraduationYear(request.graduationYear());
        student.setGithubUrl(request.githubUrl());
        student.setLinkedinUrl(request.linkedinUrl());
        student.setBio(request.bio());

        StudentProfile updatedStudent =
                studentProfileRepository.save(student);

        return new StudentProfileResponse(
                updatedStudent.getId(),
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getPhone(),
                updatedStudent.getCollege(),
                updatedStudent.getBranch(),
                updatedStudent.getSemester(),
                updatedStudent.getCgpa(),
                updatedStudent.getGraduationYear(),
                updatedStudent.getGithubUrl(),
                updatedStudent.getLinkedinUrl(),
                updatedStudent.getBio()
        );
    }
    @Transactional
    public StudentProfileResponse updateMyAccount(
            String email,
            StudentAccountUpdateRequest request
    ) {

        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() ->
                        new RuntimeException("User not found"));

        user.setFullName(request.fullName());
        user.setPhone(request.phone());

        User updatedUser = userRepository.save(user);

        StudentProfile student = studentProfileRepository
                .findByUserId(updatedUser.getId())
                .orElseThrow(() ->
                        new RuntimeException("Student profile not found"));

        return new StudentProfileResponse(
                student.getId(),
                updatedUser.getId(),
                updatedUser.getFullName(),
                updatedUser.getEmail(),
                updatedUser.getPhone(),
                student.getCollege(),
                student.getBranch(),
                student.getSemester(),
                student.getCgpa(),
                student.getGraduationYear(),
                student.getGithubUrl(),
                student.getLinkedinUrl(),
                student.getBio()
        );
    }
    @Transactional
    public void changePassword(
            String email,
            ChangePasswordRequest request
    ) {

        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() ->
                        new RuntimeException("User not found"));

        if (!passwordEncoder.matches(
                request.currentPassword(),
                user.getPassword()
        )) {
            throw new IllegalArgumentException(
                    "Current password is incorrect"
            );
        }

        if (!request.newPassword().equals(
                request.confirmPassword()
        )) {
            throw new IllegalArgumentException(
                    "New password and confirm password do not match"
            );
        }

        user.setPassword(
                passwordEncoder.encode(request.newPassword())
        );

        userRepository.save(user);
    }
}
