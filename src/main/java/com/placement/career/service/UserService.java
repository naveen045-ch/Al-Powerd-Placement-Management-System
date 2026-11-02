
package com.placement.career.service;

import com.placement.career.dto.*;
import com.placement.career.entity.*;
import com.placement.career.exception.ResourceNotFoundException;
import com.placement.career.repository.*;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final RecruiterProfileRepository recruiterProfileRepository;
    private final SkillRepository skillRepository;
    private final StudentSkillRepository studentSkillRepository;

    public UserService(
            UserRepository userRepository,
            StudentProfileRepository studentProfileRepository,
            RecruiterProfileRepository recruiterProfileRepository,
            SkillRepository skillRepository,
            StudentSkillRepository studentSkillRepository
    ) {
        this.userRepository = userRepository;
        this.studentProfileRepository = studentProfileRepository;
        this.recruiterProfileRepository = recruiterProfileRepository;
        this.skillRepository = skillRepository;
        this.studentSkillRepository = studentSkillRepository;
    }

    // EXISTING METHODS - PRESERVED

    public UserResponse getByEmail(String email) {
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() ->
                        new ResourceNotFoundException("User not found"));

        return toResponse(user);
    }

    public List<UserResponse> getAll() {
        return userRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private UserResponse toResponse(User user) {
        Set<String> roles = user.getRoles()
                .stream()
                .map(r -> r.getName().name())
                .collect(Collectors.toSet());

        return new UserResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getPhone(),
                user.isEnabled(),
                roles
        );
    }

    // GET MY COMPLETE PROFILE

    @Transactional(readOnly = true)
    public UserProfileResponse getMyProfile(String email) {

        User user = getUser(email);

        UserProfileResponse.StudentDetails studentDetails = null;
        UserProfileResponse.RecruiterDetails recruiterDetails = null;
        UserProfileResponse.CompanyDetails companyDetails = null;

        if (hasRole(user, RoleName.STUDENT)) {

            StudentProfile profile = studentProfileRepository
                    .findByUserId(user.getId())
                    .orElse(null);

            if (profile != null) {
                List<StudentSkillResponse> skills =
                        studentSkillRepository.findByStudentId(profile.getId())
                                .stream()
                                .map(this::toSkillResponse)
                                .toList();

                studentDetails =
                        new UserProfileResponse.StudentDetails(
                                profile.getCollege(),
                                profile.getBranch(),
                                profile.getSemester(),
                                profile.getCgpa(),
                                profile.getGraduationYear(),
                                profile.getGithubUrl(),
                                profile.getLinkedinUrl(),
                                profile.getBio(),
                                skills
                        );
            }
        }

        if (hasRole(user, RoleName.RECRUITER)) {

            RecruiterProfile profile = recruiterProfileRepository
                    .findByUserId(user.getId())
                    .orElse(null);

            if (profile != null) {
                recruiterDetails =
                        new UserProfileResponse.RecruiterDetails(
                                profile.getDesignation()
                        );

                Company company = profile.getCompany();

                if (company != null) {
                    companyDetails =
                            new UserProfileResponse.CompanyDetails(
                                    company.getId(),
                                    company.getName(),
                                    company.getIndustry(),
                                    company.getWebsite(),
                                    company.getLocation()
                            );
                }
            }
        }

        Set<String> roles = user.getRoles()
                .stream()
                .map(role -> role.getName().name())
                .collect(Collectors.toSet());

        return new UserProfileResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getPhone(),
                user.isEnabled(),
                roles,
                studentDetails,
                recruiterDetails,
                companyDetails
        );
    }

    // UPDATE MY PROFILE

    @Transactional
    public UserProfileResponse updateMyProfile(
            String email,
            ProfileUpdateRequest request
    ) {
        User user = getUser(email);

        // Common fields for every role.
        if (request.fullName() != null &&
                !request.fullName().isBlank()) {

            user.setFullName(request.fullName().trim());
        }

        if (request.phone() != null) {
            user.setPhone(clean(request.phone()));
        }

        // Student-specific profile.
        if (hasRole(user, RoleName.STUDENT)) {

            StudentProfile profile = studentProfileRepository
                    .findByUserId(user.getId())
                    .orElseGet(() -> {
                        StudentProfile newProfile =
                                new StudentProfile();

                        newProfile.setUser(user);
                        return newProfile;
                    });

            if (request.college() != null) {
                profile.setCollege(clean(request.college()));
            }

            if (request.branch() != null) {
                profile.setBranch(clean(request.branch()));
            }

            if (request.semester() != null) {
                profile.setSemester(request.semester());
            }

            if (request.cgpa() != null) {
                profile.setCgpa(request.cgpa());
            }

            if (request.graduationYear() != null) {
                profile.setGraduationYear(
                        request.graduationYear()
                );
            }

            if (request.githubUrl() != null) {
                profile.setGithubUrl(clean(request.githubUrl()));
            }

            if (request.linkedinUrl() != null) {
                profile.setLinkedinUrl(clean(request.linkedinUrl()));
            }

            if (request.bio() != null) {
                profile.setBio(clean(request.bio()));
            }

            studentProfileRepository.save(profile);
        }

        // Recruiter-specific profile.
        if (hasRole(user, RoleName.RECRUITER)) {

            RecruiterProfile profile = recruiterProfileRepository
                    .findByUserId(user.getId())
                    .orElseGet(() -> {
                        RecruiterProfile newProfile =
                                new RecruiterProfile();

                        newProfile.setUser(user);
                        return newProfile;
                    });

            if (request.designation() != null) {
                profile.setDesignation(
                        clean(request.designation())
                );
            }

            recruiterProfileRepository.save(profile);
        }

        userRepository.save(user);

        return getMyProfile(email);
    }

    // GET STUDENT SKILL CATALOG

    @Transactional(readOnly = true)
    public List<SkillCatalogResponse> getSkillCatalog(String email) {

        User user = getUser(email);
        requireStudentRole(user);

        return skillRepository.findAll()
                .stream()
                .sorted(Comparator.comparing(
                        Skill::getName,
                        String.CASE_INSENSITIVE_ORDER
                ))
                .map(skill -> new SkillCatalogResponse(
                        skill.getId(),
                        skill.getName(),
                        skill.getCategory()
                ))
                .toList();
    }

    // GET MY SKILLS

    @Transactional(readOnly = true)
    public List<StudentSkillResponse> getMySkills(String email) {

        User user = getUser(email);
        StudentProfile student = getStudentProfile(user);

        return studentSkillRepository.findByStudentId(student.getId())
                .stream()
                .map(this::toSkillResponse)
                .toList();
    }

    // ADD STUDENT SKILL

    @Transactional
    public StudentSkillResponse addMySkill(
            String email,
            StudentSkillRequest request
    ) {
        User user = getUser(email);
        StudentProfile student = getStudentProfile(user);

        Skill skill = skillRepository.findById(request.skillId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Skill not found"
                ));

        if (studentSkillRepository.existsByStudentIdAndSkillId(
                student.getId(),
                skill.getId()
        )) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "This skill is already added to your profile"
            );
        }

        StudentSkill studentSkill = new StudentSkill();

        studentSkill.setStudent(student);
        studentSkill.setSkill(skill);
        studentSkill.setProficiency(request.proficiency());
        studentSkill.setYearsOfExperience(
                request.yearsOfExperience()
        );

        StudentSkill saved =
                studentSkillRepository.save(studentSkill);

        return toSkillResponse(saved);
    }

    // UPDATE STUDENT SKILL

    @Transactional
    public StudentSkillResponse updateMySkill(
            String email,
            Long studentSkillId,
            StudentSkillUpdateRequest request
    ) {
        User user = getUser(email);
        StudentProfile student = getStudentProfile(user);

        StudentSkill studentSkill =
                studentSkillRepository.findById(studentSkillId)
                        .orElseThrow(() -> new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Student skill not found"
                        ));

        verifySkillOwnership(studentSkill, user);

        studentSkill.setProficiency(request.proficiency());
        studentSkill.setYearsOfExperience(
                request.yearsOfExperience()
        );

        StudentSkill saved =
                studentSkillRepository.save(studentSkill);

        return toSkillResponse(saved);
    }

    // DELETE STUDENT SKILL

    @Transactional
    public void deleteMySkill(
            String email,
            Long studentSkillId
    ) {
        User user = getUser(email);

        getStudentProfile(user);

        StudentSkill studentSkill =
                studentSkillRepository.findById(studentSkillId)
                        .orElseThrow(() -> new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Student skill not found"
                        ));

        verifySkillOwnership(studentSkill, user);

        studentSkillRepository.delete(studentSkill);
    }

    // COMMON HELPERS

    private User getUser(String email) {

        return userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "User not found"
                ));
    }

    private boolean hasRole(User user, RoleName roleName) {

        return user.getRoles()
                .stream()
                .anyMatch(role -> role.getName() == roleName);
    }

    private void requireStudentRole(User user) {

        if (!hasRole(user, RoleName.STUDENT)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Only students can manage student skills"
            );
        }
    }

    private StudentProfile getStudentProfile(User user) {

        requireStudentRole(user);

        return studentProfileRepository
                .findByUserId(user.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Student profile not found"
                ));
    }

    private void verifySkillOwnership(
            StudentSkill studentSkill,
            User user
    ) {
        Long ownerUserId = studentSkill.getStudent()
                .getUser()
                .getId();

        if (!ownerUserId.equals(user.getId())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "You cannot modify another student's skill"
            );
        }
    }

    private StudentSkillResponse toSkillResponse(
            StudentSkill studentSkill
    ) {
        Skill skill = studentSkill.getSkill();

        return new StudentSkillResponse(
                studentSkill.getId(),
                skill.getId(),
                skill.getName(),
                skill.getCategory(),
                studentSkill.getProficiency(),
                studentSkill.getYearsOfExperience()
        );
    }

    private String clean(String value) {

        if (value == null) {
            return null;
        }

        String trimmed = value.trim();

        return trimmed.isEmpty() ? null : trimmed;
    }
}
