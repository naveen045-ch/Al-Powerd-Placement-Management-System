package com.placement.career.config;

import com.placement.career.entity.*;
import com.placement.career.entity.Role;
import com.placement.career.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.*;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class DataInitializer {

    @Bean
    CommandLineRunner seedData(
            RoleRepository roleRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            StudentProfileRepository studentProfileRepository,
            RecruiterProfileRepository recruiterProfileRepository,
            CompanyRepository companyRepository) {

        return args -> {
            for (RoleName roleName : RoleName.values()) {
                roleRepository.findByName(roleName)
                        .orElseGet(() -> roleRepository.save(new Role(roleName)));
            }

            Company company = companyRepository.findAll().stream().findFirst().orElseGet(() -> {
                Company c = new Company();
                c.setName("Demo Technologies");
                c.setIndustry("Software");
                c.setLocation("Bengaluru");
                c.setWebsite("https://example.com");
                c.setDescription("Demo company for development and testing.");
                return companyRepository.save(c);
            });

            createUserIfMissing(
                    userRepository, roleRepository, passwordEncoder,
                    "System Admin", "admin@placement.local", "Admin@123",
                    RoleName.ADMIN);

            createUserIfMissing(
                    userRepository, roleRepository, passwordEncoder,
                    "Placement Officer", "officer@placement.local", "Officer@123",
                    RoleName.PLACEMENT_OFFICER);

            User recruiter = createUserIfMissing(
                    userRepository, roleRepository, passwordEncoder,
                    "Demo Recruiter", "recruiter@placement.local", "Recruiter@123",
                    RoleName.RECRUITER);

            if (recruiterProfileRepository.findAll().isEmpty()) {
                RecruiterProfile profile = new RecruiterProfile();
                profile.setUser(recruiter);
                profile.setCompany(company);
                profile.setDesignation("Talent Acquisition");
                recruiterProfileRepository.save(profile);
            }

            User student = createUserIfMissing(
                    userRepository, roleRepository, passwordEncoder,
                    "Demo Student", "student@placement.local", "Student@123",
                    RoleName.STUDENT);

            if (studentProfileRepository.findByUserId(student.getId()).isEmpty()) {
                StudentProfile profile = new StudentProfile();
                profile.setUser(student);
                profile.setCollege("Demo Engineering College");
                profile.setBranch("Computer Science Engineering");
                profile.setSemester(7);
                profile.setCgpa(8.2);
                profile.setGraduationYear(2027);
                studentProfileRepository.save(profile);
            }
        };
    }

    private User createUserIfMissing(
            UserRepository userRepository,
            RoleRepository roleRepository,
            PasswordEncoder encoder,
            String name, String email, String password, RoleName roleName) {

        return userRepository.findByEmailIgnoreCase(email).orElseGet(() -> {
            User user = new User();
            user.setFullName(name);
            user.setEmail(email);
            user.setPassword(encoder.encode(password));
            user.getRoles().add(
                    roleRepository.findByName(roleName)
                            .orElseThrow());
            return userRepository.save(user);
        });
    }
}
