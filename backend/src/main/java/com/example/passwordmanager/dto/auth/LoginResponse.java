package com.example.passwordmanager.dto.auth;

import com.example.passwordmanager.dto.common.UserSummary;

public record LoginResponse(
        String accessToken,
        long expiresIn,
        UserSummary user,
        String wrappedVaultKey,
        String refreshToken
) {
    public LoginResponse(String accessToken, long expiresIn, UserSummary user, String wrappedVaultKey) {
        this(accessToken, expiresIn, user, wrappedVaultKey, null);
    }
}
