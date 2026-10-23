package com.example.passwordmanager.security;

import com.example.passwordmanager.exception.ApiException;
import com.example.passwordmanager.exception.ErrorCode;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.UUID;

public final class CurrentUser {

    private CurrentUser() {
    }

    public static UUID id() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new ApiException(ErrorCode.UNAUTHORIZED, HttpStatus.UNAUTHORIZED, "Unauthenticated request");
        }
        if (auth.getPrincipal() instanceof Jwt jwt) {
            String sub = jwt.getSubject();
            if (sub == null) {
                throw new ApiException(ErrorCode.UNAUTHORIZED, HttpStatus.UNAUTHORIZED, "Invalid token: missing subject");
            }
            try {
                return UUID.fromString(sub);
            } catch (IllegalArgumentException e) {
                throw new ApiException(ErrorCode.UNAUTHORIZED, HttpStatus.UNAUTHORIZED, "Invalid user ID in token");
            }
        }
        throw new ApiException(ErrorCode.UNAUTHORIZED, HttpStatus.UNAUTHORIZED, "Invalid authentication principal");
    }
}
