package com.placement.career.controller;

import com.placement.career.dto.PlacementJobResponse;
import com.placement.career.dto.PlacementOfficerDashboardResponse;
import com.placement.career.service.PlacementOfficerService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.placement.career.dto.PlacementStudentResponse;
import com.placement.career.dto.PlacementCompanyResponse;
import com.placement.career.dto.PlacementApplicationResponse;
import com.placement.career.dto.SelectedStudentResponse;
import com.placement.career.dto.PlacementStatisticsResponse;
import java.util.List;

@RestController
@RequestMapping("/api/officer")
@PreAuthorize("hasRole('PLACEMENT_OFFICER')")
public class PlacementOfficerController {

    private final PlacementOfficerService placementOfficerService;

    public PlacementOfficerController(
            PlacementOfficerService placementOfficerService
    ) {
        this.placementOfficerService = placementOfficerService;
    }
    @GetMapping("/students")
    public List<PlacementStudentResponse> getAllStudents() {
        return placementOfficerService.getAllStudents();
    }

    @GetMapping("/dashboard")
    public PlacementOfficerDashboardResponse getDashboard() {
        return placementOfficerService.getDashboard();
    }
    @GetMapping("/companies")
    public List<PlacementCompanyResponse> getAllCompanies() {
        return placementOfficerService.getAllCompanies();
    }
    @GetMapping("/jobs")
    public List<PlacementJobResponse> getAllJobs() {
        return placementOfficerService.getAllJobs();
    }
    @GetMapping("/applications")
    public List<PlacementApplicationResponse> getAllApplications() {
        return placementOfficerService.getAllApplications();
    }
    @GetMapping("/selected-students")
    public List<SelectedStudentResponse> getSelectedStudents() {
        return placementOfficerService.getSelectedStudents();
    }
    @GetMapping("/statistics")
    public PlacementStatisticsResponse getPlacementStatistics() {
        return placementOfficerService.getPlacementStatistics();
    }
}
