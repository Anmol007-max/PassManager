package com.example.passwordmanager.exception;

import com.example.passwordmanager.security.RateLimiter;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import java.net.URI;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    @ExceptionHandler(RateLimiter.RateLimitException.class)
    public ResponseEntity<ProblemDetail> handleRateLimit(RateLimiter.RateLimitException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.TOO_MANY_REQUESTS, ex.getMessage());
        problem.setType(URI.create("about:blank"));
        problem.setTitle("Rate Limit Exceeded");
        problem.setProperty("code", ex.getErrorCode().name());

        HttpHeaders headers = new HttpHeaders();
        headers.set("Retry-After", String.valueOf(ex.getRetryAfterSeconds()));
        return new ResponseEntity<>(problem, headers, HttpStatus.TOO_MANY_REQUESTS);
    }

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ProblemDetail> handleApiException(ApiException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(ex.getStatus(), ex.getMessage());
        problem.setType(URI.create("about:blank"));
        problem.setTitle(ex.getStatus().getReasonPhrase());
        problem.setProperty("code", ex.getErrorCode().name());
        return new ResponseEntity<>(problem, ex.getStatus());
    }

    @ExceptionHandler(OptimisticLockingFailureException.class)
    public ResponseEntity<ProblemDetail> handleOptimisticLock(OptimisticLockingFailureException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, "Resource was modified by another request");
        problem.setType(URI.create("about:blank"));
        problem.setTitle("Conflict");
        problem.setProperty("code", ErrorCode.REVISION_CONFLICT.name());
        return new ResponseEntity<>(problem, HttpStatus.CONFLICT);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ProblemDetail> handleDataIntegrity(DataIntegrityViolationException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, "Data integrity conflict");
        problem.setType(URI.create("about:blank"));
        problem.setTitle("Conflict");
        problem.setProperty("code", ErrorCode.ENTRY_EXISTS.name());
        return new ResponseEntity<>(problem, HttpStatus.CONFLICT);
    }

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(
            MethodArgumentNotValidException ex,
            HttpHeaders headers,
            HttpStatusCode status,
            WebRequest request) {

        Map<String, String> fieldErrors = new HashMap<>();
        for (FieldError error : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.put(error.getField(), error.getDefaultMessage());
        }

        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Validation failed");
        problem.setType(URI.create("about:blank"));
        problem.setTitle("Validation Failed");
        problem.setProperty("code", ErrorCode.VALIDATION_FAILED.name());
        problem.setProperty("errors", fieldErrors);

        return new ResponseEntity<>(problem, HttpStatus.BAD_REQUEST);
    }

    @Override
    protected ResponseEntity<Object> handleHttpMessageNotReadable(
            HttpMessageNotReadableException ex,
            HttpHeaders headers,
            HttpStatusCode status,
            WebRequest request) {

        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Malformed JSON or invalid request format");
        problem.setType(URI.create("about:blank"));
        problem.setTitle("Bad Request");
        problem.setProperty("code", ErrorCode.BAD_REQUEST.name());

        return new ResponseEntity<>(problem, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ProblemDetail> handleAllOther(Exception ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR, "An internal server error occurred");
        problem.setType(URI.create("about:blank"));
        problem.setTitle("Internal Server Error");
        problem.setProperty("code", ErrorCode.INTERNAL_ERROR.name());
        return new ResponseEntity<>(problem, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
