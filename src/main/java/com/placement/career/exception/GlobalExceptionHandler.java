package com.placement.career.exception;

import com.google.genai.errors.ServerException;
import jakarta.validation.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import com.placement.career.exception.OtpRateLimitException;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log =
            LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiError> notFound(
            ResourceNotFoundException ex) {

        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(new ApiError(
                        LocalDateTime.now(),
                        404,
                        ex.getMessage(),
                        Map.of()
                ));
    }

    @ExceptionHandler({
            IllegalArgumentException.class,
            BadCredentialsException.class
    })
    public ResponseEntity<ApiError> badRequest(
            RuntimeException ex) {

        return ResponseEntity
                .badRequest()
                .body(new ApiError(
                        LocalDateTime.now(),
                        400,
                        ex.getMessage(),
                        Map.of()
                ));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> validation(
            MethodArgumentNotValidException ex) {

        Map<String, String> errors = new LinkedHashMap<>();

        ex.getBindingResult()
                .getFieldErrors()
                .forEach(error ->
                        errors.put(
                                error.getField(),
                                error.getDefaultMessage()
                        )
                );

        return ResponseEntity
                .badRequest()
                .body(new ApiError(
                        LocalDateTime.now(),
                        400,
                        "Validation failed",
                        errors
                ));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiError> constraintViolation(
            ConstraintViolationException ex) {

        Map<String, String> errors = new LinkedHashMap<>();

        ex.getConstraintViolations()
                .forEach(error ->
                        errors.put(
                                error.getPropertyPath().toString(),
                                error.getMessage()
                        )
                );

        return ResponseEntity
                .badRequest()
                .body(new ApiError(
                        LocalDateTime.now(),
                        400,
                        "Validation failed",
                        errors
                ));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiError> dataIntegrity(
            DataIntegrityViolationException ex) {

        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(new ApiError(
                        LocalDateTime.now(),
                        409,
                        "Database conflict. The requested operation violates a data constraint.",
                        Map.of()
                ));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiError> accessDenied(
            AccessDeniedException ex) {

        return ResponseEntity
                .status(HttpStatus.FORBIDDEN)
                .body(new ApiError(
                        LocalDateTime.now(),
                        403,
                        "You do not have permission to perform this operation.",
                        Map.of()
                ));
    }

    @ExceptionHandler(ServerException.class)
    public ResponseEntity<ApiError> geminiServerError(
            ServerException ex) {

        return ResponseEntity
                .status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(new ApiError(
                        LocalDateTime.now(),
                        503,
                        "AI service is temporarily unavailable. Please try again later.",
                        Map.of()
                ));
    }


    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> generic(Exception ex) {

        log.error("Unexpected server error: {}", ex.getMessage(), ex);

        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ApiError(
                        LocalDateTime.now(),
                        500,
                        "Unexpected server error",
                        Map.of()
                ));
    }
    @ExceptionHandler(OtpRateLimitException.class)
    public ResponseEntity<ApiError> otpRateLimit(
            OtpRateLimitException ex) {

        return ResponseEntity
                .status(HttpStatus.TOO_MANY_REQUESTS)
                .body(new ApiError(
                        LocalDateTime.now(),
                        429,
                        ex.getMessage(),
                        Map.of()
                ));
    }

}
