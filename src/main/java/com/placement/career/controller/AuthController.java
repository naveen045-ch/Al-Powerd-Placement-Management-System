
package com.placement.career.controller;

import com.placement.career.dto.*;
import com.placement.career.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(
            @Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<LoginOtpResponse> login(
            @Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/login/verify-otp")
    public ResponseEntity<AuthResponse> verifyLoginOtp(
            @Valid @RequestBody VerifyLoginOtpRequest request) {
        return ResponseEntity.ok(authService.verifyLoginOtp(request));
    }
    @PostMapping("/login/resend-otp")
    public ResponseEntity<LoginOtpResponse> resendLoginOtp(
            @RequestParam String challengeId) {

        return ResponseEntity.ok(
                authService.resendLoginOtp(challengeId));
    }
}
