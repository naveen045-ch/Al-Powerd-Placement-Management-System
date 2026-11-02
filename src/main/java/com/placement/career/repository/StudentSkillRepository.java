
package com.placement.career.repository;

import com.placement.career.entity.StudentSkill;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StudentSkillRepository
        extends JpaRepository<StudentSkill, Long> {

    List<StudentSkill> findByStudentId(Long studentId);

    boolean existsByStudentIdAndSkillId(
            Long studentId,
            Long skillId
    );

    Optional<StudentSkill> findByStudentIdAndSkillId(
            Long studentId,
            Long skillId
    );
}
