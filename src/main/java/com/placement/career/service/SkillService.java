package com.placement.career.service;

import com.placement.career.dto.*;
import com.placement.career.entity.*;
import com.placement.career.exception.ResourceNotFoundException;
import com.placement.career.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class SkillService {

    private final SkillRepository skillRepository;
    private final StudentSkillRepository studentSkillRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final UserRepository userRepository;

    public SkillService(
            SkillRepository skillRepository,
            StudentSkillRepository studentSkillRepository,
            StudentProfileRepository studentProfileRepository,
            UserRepository userRepository) {

        this.skillRepository = skillRepository;
        this.studentSkillRepository = studentSkillRepository;
        this.studentProfileRepository = studentProfileRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public SkillResponse createSkill(SkillCreateRequest request) {

        if (skillRepository.existsByNameIgnoreCase(request.name())) {
            throw new IllegalArgumentException(
                    "Skill already exists"
            );
        }

        Skill skill = new Skill();

        skill.setName(request.name().trim());
        skill.setCategory(request.category());

        Skill savedSkill = skillRepository.save(skill);

        return new SkillResponse(
                savedSkill.getId(),
                savedSkill.getName(),
                savedSkill.getCategory()
        );
    }

    public List<SkillResponse> getAllSkills() {

        return skillRepository.findAll()
                .stream()
                .map(skill -> new SkillResponse(
                        skill.getId(),
                        skill.getName(),
                        skill.getCategory()
                ))
                .toList();
    }

    @Transactional
    public StudentSkillResponse addStudentSkill(
            String email,
            StudentSkillRequest request) {

        User user = userRepository
                .findByEmailIgnoreCase(email)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "User not found"
                        ));

        StudentProfile student =
                studentProfileRepository
                        .findByUserId(user.getId())
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Student profile not found"
                                ));

        if (studentSkillRepository
                .findByStudentIdAndSkillId(
                        student.getId(),
                        request.skillId()
                )
                .isPresent()) {

            throw new IllegalArgumentException(
                    "Student already has this skill"
            );
        }

        Skill skill = skillRepository
                .findById(request.skillId())
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Skill not found"
                        ));

        StudentSkill studentSkill = new StudentSkill();

        studentSkill.setStudent(student);
        studentSkill.setSkill(skill);
        studentSkill.setProficiency(
                request.proficiency()
        );
        studentSkill.setYearsOfExperience(
                request.yearsOfExperience()
        );

        StudentSkill saved =
                studentSkillRepository.save(studentSkill);

        return new StudentSkillResponse(
                saved.getId(),
                skill.getId(),
                skill.getName(),
                saved.getProficiency(),
                saved.getYearsOfExperience()
        );
    }

    public List<StudentSkillResponse> getMySkills(
            String email) {

        User user = userRepository
                .findByEmailIgnoreCase(email)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "User not found"
                        ));

        StudentProfile student =
                studentProfileRepository
                        .findByUserId(user.getId())
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Student profile not found"
                                ));

        return studentSkillRepository
                .findByStudentId(student.getId())
                .stream()
                .map(skill -> new StudentSkillResponse(
                        skill.getId(),
                        skill.getSkill().getId(),
                        skill.getSkill().getName(),
                        skill.getProficiency(),
                        skill.getYearsOfExperience()
                ))
                .toList();
    }
    @Transactional
    public StudentSkillResponse updateStudentSkill(
            String email,
            Long studentSkillId,
            StudentSkillUpdateRequest request) {

        User user = userRepository
                .findByEmailIgnoreCase(email)
                .orElseThrow(() ->
                        new ResourceNotFoundException("User not found"));

        StudentProfile student = studentProfileRepository
                .findByUserId(user.getId())
                .orElseThrow(() ->
                        new ResourceNotFoundException("Student profile not found"));

        StudentSkill studentSkill = studentSkillRepository
                .findById(studentSkillId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Student skill not found"));

        if (!studentSkill.getStudent().getId().equals(student.getId())) {
            throw new IllegalArgumentException(
                    "You can update only your own skills"
            );
        }

        studentSkill.setProficiency(request.proficiency());
        studentSkill.setYearsOfExperience(request.yearsOfExperience());

        StudentSkill saved = studentSkillRepository.save(studentSkill);

        return new StudentSkillResponse(
                saved.getId(),
                saved.getSkill().getId(),
                saved.getSkill().getName(),
                saved.getProficiency(),
                saved.getYearsOfExperience()
        );
    }

    @Transactional
    public void deleteStudentSkill(
            String email,
            Long studentSkillId) {

        User user = userRepository
                .findByEmailIgnoreCase(email)
                .orElseThrow(() ->
                        new ResourceNotFoundException("User not found"));

        StudentProfile student = studentProfileRepository
                .findByUserId(user.getId())
                .orElseThrow(() ->
                        new ResourceNotFoundException("Student profile not found"));

        StudentSkill studentSkill = studentSkillRepository
                .findById(studentSkillId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Student skill not found"));

        if (!studentSkill.getStudent().getId().equals(student.getId())) {
            throw new IllegalArgumentException(
                    "You can delete only your own skills"
            );
        }

        studentSkillRepository.delete(studentSkill);
    }
}
