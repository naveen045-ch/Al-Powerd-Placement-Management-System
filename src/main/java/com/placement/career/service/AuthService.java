package com.placement.career.service;

import com.placement.career.dto.AuthResponse;
import com.placement.career.dto.LoginOtpResponse;
import com.placement.career.dto.LoginRequest;
import com.placement.career.dto.RegisterRequest;
import com.placement.career.dto.VerifyLoginOtpRequest;

import com.placement.career.entity.Role;
import com.placement.career.entity.RoleName;
import com.placement.career.entity.StudentProfile;
import com.placement.career.entity.User;

import com.placement.career.repository.LoginOtpChallengeRepository;
import com.placement.career.repository.RoleRepository;
import com.placement.career.repository.StudentProfileRepository;
import com.placement.career.repository.UserRepository;

import com.placement.career.security.CustomUserDetailsService;
import com.placement.career.security.JwtService;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final CustomUserDetailsService userDetailsService;
    private final JwtService jwtService;
    private final StudentProfileRepository studentProfileRepository;
    private final LoginOtpService loginOtpService;

    public AuthService(
            UserRepository userRepository,
            RoleRepository roleRepository,
            PasswordEncoder passwordEncoder,
            AuthenticationManager authenticationManager,
            CustomUserDetailsService userDetailsService,
            JwtService jwtService,
            StudentProfileRepository studentProfileRepository,
            LoginOtpService loginOtpService
    ) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.userDetailsService = userDetailsService;
        this.jwtService = jwtService;
        this.studentProfileRepository = studentProfileRepository;
        this.loginOtpService = loginOtpService;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {

        String email = request.email().trim();

        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new IllegalArgumentException(
                    "Email is already registered"
            );
        }

        Role role = roleRepository.findByName(request.role())
                .orElseThrow(() ->
                        new IllegalArgumentException("Invalid role")
                );

        User user = new User();
        user.setFullName(request.fullName());
        user.setEmail(email.toLowerCase(Locale.ROOT));
        user.setPassword(
                passwordEncoder.encode(request.password())
        );
        user.setPhone(request.phone());
        user.getRoles().add(role);

        User saved = userRepository.save(user);

        if (request.role() == RoleName.STUDENT) {
            StudentProfile profile = new StudentProfile();
            profile.setUser(saved);
            studentProfileRepository.save(profile);
        }

        UserDetails details =
                userDetailsService.loadUserByUsername(saved.getEmail());

        String token = jwtService.generateToken(details);

        return toResponse(saved, token);
    }

    /**
     * Authenticate credentials first, then send OTP to that account's
     * registered email address.
     */
    public LoginOtpResponse login(LoginRequest request) {

        if (request.email() == null ||
                request.email().trim().isEmpty()) {

            throw new BadCredentialsException(
                    "Invalid credentials"
            );
        }

        String loginEmail =
                request.email().trim().toLowerCase(Locale.ROOT);

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        loginEmail,
                        request.password()
                )
        );

        User user = userRepository
                .findByEmailIgnoreCase(loginEmail)
                .orElseThrow(() ->
                        new BadCredentialsException(
                                "Invalid credentials"
                        )
                );

        // IMPORTANT:
        // Use the email stored on the authenticated user record.
        // OTP is not sent to an arbitrary client-supplied address.
        return loginOtpService.sendLoginOtp(user.getEmail());
    }

    public AuthResponse verifyLoginOtp(
            VerifyLoginOtpRequest request
    ) {
        String verifiedEmail =
                loginOtpService.verifyLoginOtp(
                        request.challengeId(),
                        request.otp()
                );

        if (verifiedEmail == null) {
            throw new BadCredentialsException(
                    "Invalid, expired, or already used OTP"
            );
        }

        User user = userRepository
                .findByEmailIgnoreCase(verifiedEmail)
                .orElseThrow(() ->
                        new BadCredentialsException(
                                "Invalid login challenge"
                        )
                );

        UserDetails details =
                userDetailsService.loadUserByUsername(
                        user.getEmail()
                );

        String token = jwtService.generateToken(details);

        return toResponse(user, token);
    }

    public LoginOtpResponse resendLoginOtp(
            String challengeId
    ) {
        return loginOtpService.resendLoginOtp(challengeId);
    }

    private AuthResponse toResponse(
            User user,
            String token
    ) {
        Set<String> roles = user.getRoles()
                .stream()
                .map(role -> role.getName().name())
                .collect(Collectors.toSet());

        return new AuthResponse(
                token,
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                roles
        );
    }
}