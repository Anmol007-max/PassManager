package com.example.passwordmanager.controller;

import com.example.passwordmanager.dto.auth.*;
import com.example.passwordmanager.dto.common.UserSummary;
import com.example.passwordmanager.exception.ApiException;
import com.example.passwordmanager.exception.ErrorCode;
import com.example.passwordmanager.security.ClientIpResolver;
import com.example.passwordmanager.security.CurrentUser;
import com.example.passwordmanager.service.AuthService;
import com.example.passwordmanager.service.PreloginService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final PreloginService preloginService;
    private final ClientIpResolver clientIpResolver;

    public AuthController(AuthService authService,
                          PreloginService preloginService,
                          ClientIpResolver clientIpResolver) {
        this.authService = authService;
        this.preloginService = preloginService;
        this.clientIpResolver = clientIpResolver;
    }

    @PostMapping("/prelogin")
    public ResponseEntity<PreloginResponse> prelogin(@Valid @RequestBody PreloginRequest request) {
        PreloginResponse response = preloginService.getPreloginParams(request.email());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/register")
    public ResponseEntity<UserSummary> register(@Valid @RequestBody RegisterRequest request,
                                                HttpServletRequest servletRequest) {
        String ip = clientIpResolver.resolve(servletRequest);
        String userAgent = servletRequest.getHeader(HttpHeaders.USER_AGENT);
        UserSummary summary = authService.register(request, ip, userAgent);
        return ResponseEntity.status(HttpStatus.CREATED).body(summary);
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request,
                                               @RequestHeader(value = "X-PM-Client", required = false) String clientHeader,
                                               HttpServletRequest servletRequest) {
        String ip = clientIpResolver.resolve(servletRequest);
        String userAgent = servletRequest.getHeader(HttpHeaders.USER_AGENT);
        AuthService.LoginResult result = authService.login(request, ip, userAgent);

        LoginResponse resp = result.response();
        if ("mobile".equalsIgnoreCase(clientHeader)) {
            resp = new LoginResponse(
                    resp.accessToken(),
                    resp.expiresIn(),
                    resp.user(),
                    resp.wrappedVaultKey(),
                    result.rawRefreshToken()
            );
        }

        var builder = ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, result.refreshCookie().toString());
        if ("mobile".equalsIgnoreCase(clientHeader) && result.rawRefreshToken() != null) {
            builder.header("X-PM-Refresh-Token", result.rawRefreshToken());
        }

        return builder.body(resp);
    }

    @PostMapping("/refresh")
    public ResponseEntity<RefreshResponse> refresh(
            @CookieValue(name = "pm_refresh", required = false) String cookieRefreshToken,
            @RequestHeader(value = "X-PM-Refresh-Token", required = false) String headerRefreshToken,
            @RequestHeader(value = "X-PM-Client", required = false) String clientHeader,
            HttpServletRequest servletRequest) {

        if (!"web".equalsIgnoreCase(clientHeader) && !"mobile".equalsIgnoreCase(clientHeader)) {
            throw new ApiException(ErrorCode.BAD_REQUEST, HttpStatus.BAD_REQUEST, "Missing or invalid X-PM-Client header");
        }

        String refreshToken = (headerRefreshToken != null && !headerRefreshToken.isBlank())
                ? headerRefreshToken
                : cookieRefreshToken;

        if (refreshToken == null || refreshToken.isBlank()) {
            throw new ApiException(ErrorCode.INVALID_REFRESH, HttpStatus.UNAUTHORIZED, "Refresh token is missing");
        }

        String ip = clientIpResolver.resolve(servletRequest);
        String userAgent = servletRequest.getHeader(HttpHeaders.USER_AGENT);

        try {
            AuthService.RefreshResult result = authService.rotateToken(refreshToken, ip, userAgent);
            RefreshResponse resp = result.response();
            if ("mobile".equalsIgnoreCase(clientHeader)) {
                resp = new RefreshResponse(resp.accessToken(), resp.expiresIn(), result.rawRefreshToken());
            }

            var builder = ResponseEntity.ok()
                    .header(HttpHeaders.SET_COOKIE, result.refreshCookie().toString());
            if ("mobile".equalsIgnoreCase(clientHeader) && result.rawRefreshToken() != null) {
                builder.header("X-PM-Refresh-Token", result.rawRefreshToken());
            }

            return builder.body(resp);
        } catch (ApiException e) {
            // Clear refresh cookie on refresh failure per BACKEND_DESIGN.md Section 7.1
            ResponseCookie clearCookie = authService.logout(null, ip, userAgent);
            return ResponseEntity.status(e.getStatus())
                    .header(HttpHeaders.SET_COOKIE, clearCookie.toString())
                    .build();
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @CookieValue(name = "pm_refresh", required = false) String cookieRefreshToken,
            @RequestHeader(value = "X-PM-Refresh-Token", required = false) String headerRefreshToken,
            @RequestHeader(value = "X-PM-Client", required = false) String clientHeader,
            HttpServletRequest servletRequest) {

        if (!"web".equalsIgnoreCase(clientHeader) && !"mobile".equalsIgnoreCase(clientHeader)) {
            throw new ApiException(ErrorCode.BAD_REQUEST, HttpStatus.BAD_REQUEST, "Missing or invalid X-PM-Client header");
        }

        String refreshToken = (headerRefreshToken != null && !headerRefreshToken.isBlank())
                ? headerRefreshToken
                : cookieRefreshToken;

        String ip = clientIpResolver.resolve(servletRequest);
        String userAgent = servletRequest.getHeader(HttpHeaders.USER_AGENT);

        ResponseCookie clearCookie = authService.logout(refreshToken, ip, userAgent);
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, clearCookie.toString())
                .build();
    }

    @PostMapping("/change-password")
    public ResponseEntity<Void> changePassword(@Valid @RequestBody ChangePasswordRequest request,
                                               HttpServletRequest servletRequest) {
        String ip = clientIpResolver.resolve(servletRequest);
        String userAgent = servletRequest.getHeader(HttpHeaders.USER_AGENT);
        authService.changePassword(CurrentUser.id(), request, ip, userAgent);
        return ResponseEntity.noContent().build();
    }
}
