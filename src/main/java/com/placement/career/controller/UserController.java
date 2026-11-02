
package com.placement.career.controller;

import com.placement.career.dto.*;
import com.placement.career.service.UserService;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    // EXISTING: GET CURRENT USER
    @GetMapping("/me")
    public UserResponse me(Authentication authentication) {
        return userService.getByEmail(authentication.getName());
    }

    // EXISTING: GET ALL USERS
    @GetMapping("/all")
    public List<UserResponse> all() {
        return userService.getAll();
    }

    // GET COMPLETE PROFILE
    @GetMapping("/me/profile")
    public UserProfileResponse getMyProfile(
            Authentication authentication
    ) {
        return userService.getMyProfile(authentication.getName());
    }

    // UPDATE MY PROFILE
    @PutMapping("/me/profile")
    public UserProfileResponse updateMyProfile(
            Authentication authentication,
            @Valid @RequestBody ProfileUpdateRequest request
    ) {
        return userService.updateMyProfile(
                authentication.getName(),
                request
        );
    }

    // GET SKILL CATALOG
    @GetMapping("/me/skills/catalog")
    public List<SkillCatalogResponse> getSkillCatalog(
            Authentication authentication
    ) {
        return userService.getSkillCatalog(authentication.getName());
    }

    // GET MY SKILLS
    @GetMapping("/me/skills")
    public List<StudentSkillResponse> getMySkills(
            Authentication authentication
    ) {
        return userService.getMySkills(authentication.getName());
    }

    // ADD SKILL
    @PostMapping("/me/skills")
    @ResponseStatus(HttpStatus.CREATED)
    public StudentSkillResponse addMySkill(
            Authentication authentication,
            @Valid @RequestBody StudentSkillRequest request
    ) {
        return userService.addMySkill(
                authentication.getName(),
                request
        );
    }

    // UPDATE SKILL
    @PutMapping("/me/skills/{studentSkillId}")
    public StudentSkillResponse updateMySkill(
            Authentication authentication,
            @PathVariable Long studentSkillId,
            @Valid @RequestBody StudentSkillUpdateRequest request
    ) {
        return userService.updateMySkill(
                authentication.getName(),
                studentSkillId,
                request
        );
    }

    // DELETE SKILL
    @DeleteMapping("/me/skills/{studentSkillId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteMySkill(
            Authentication authentication,
            @PathVariable Long studentSkillId
    ) {
        userService.deleteMySkill(
                authentication.getName(),
                studentSkillId
        );
    }
}
