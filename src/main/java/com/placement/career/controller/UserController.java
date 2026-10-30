package com.placement.career.controller;

import com.placement.career.dto.UserResponse;
import com.placement.career.service.UserService;
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

    @GetMapping("/me")
    public UserResponse me(Authentication authentication) {
        return userService.getByEmail(authentication.getName());
    }

    @GetMapping("/all")
    public List<UserResponse> all() {
        return userService.getAll();
    }
}
