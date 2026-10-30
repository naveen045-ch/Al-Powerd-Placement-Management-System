package com.placement.career.service;

import com.placement.career.dto.RecruiterCompanyRequest;
import com.placement.career.dto.RecruiterCompanyResponse;
import com.placement.career.entity.Company;
import com.placement.career.entity.RecruiterProfile;
import com.placement.career.entity.User;
import com.placement.career.exception.ResourceNotFoundException;
import com.placement.career.repository.CompanyRepository;
import com.placement.career.repository.RecruiterProfileRepository;
import com.placement.career.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RecruiterCompanyService {

    private final CompanyRepository companyRepository;
    private final RecruiterProfileRepository recruiterProfileRepository;
    private final UserRepository userRepository;

    public RecruiterCompanyService(
            CompanyRepository companyRepository,
            RecruiterProfileRepository recruiterProfileRepository,
            UserRepository userRepository) {

        this.companyRepository = companyRepository;
        this.recruiterProfileRepository = recruiterProfileRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public RecruiterCompanyResponse getMyCompany(String email) {

        RecruiterProfile recruiter = getRecruiterProfile(email);

        if (recruiter.getCompany() == null) {
            throw new ResourceNotFoundException(
                    "Recruiter is not associated with a company"
            );
        }

        return toResponse(recruiter);
    }

    @Transactional
    public RecruiterCompanyResponse createOrUpdateCompany(
            String email,
            RecruiterCompanyRequest request) {

        RecruiterProfile recruiter = getRecruiterProfile(email);

        Company company = recruiter.getCompany();

        if (company == null) {
            company = new Company();
        }

        company.setName(request.name().trim());
        company.setIndustry(request.industry());
        company.setWebsite(request.website());
        company.setLocation(request.location());
        company.setDescription(request.description());

        Company savedCompany = companyRepository.save(company);

        recruiter.setCompany(savedCompany);
        recruiterProfileRepository.save(recruiter);

        return toResponse(recruiter);
    }

    private RecruiterProfile getRecruiterProfile(String email) {

        User user = userRepository
                .findByEmailIgnoreCase(email)
                .orElseThrow(() ->
                        new ResourceNotFoundException("User not found"));

        return recruiterProfileRepository
                .findByUserId(user.getId())
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Recruiter profile not found"
                        ));
    }

    private RecruiterCompanyResponse toResponse(
            RecruiterProfile recruiter) {

        Company company = recruiter.getCompany();

        return new RecruiterCompanyResponse(
                company.getId(),
                company.getName(),
                company.getIndustry(),
                company.getWebsite(),
                company.getLocation(),
                company.getDescription(),
                recruiter.getId(),
                recruiter.getUser().getFullName(),
                recruiter.getDesignation()
        );
    }
}