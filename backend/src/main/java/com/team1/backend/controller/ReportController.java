package com.team1.backend.controller;

import com.team1.backend.dto.ReportResponse;
import com.team1.backend.service.ReportService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final ReportService reportService;

    public ReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    @GetMapping
    public ReportResponse getReports(
            @RequestParam(required = false) String project,
            @RequestParam(required = false) String userEmail,
            @RequestParam(required = false) String role
    ) {
        return reportService.getProjectReport(project, userEmail, role);
    }
}
