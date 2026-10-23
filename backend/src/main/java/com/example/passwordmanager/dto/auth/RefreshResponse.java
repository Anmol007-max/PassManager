package com.example.passwordmanager.dto.auth;

public record RefreshResponse(
        String accessToken,
        long expiresIn,
        String refreshToken
) {
    public RefreshResponse(String accessToken, long expiresIn) {
        this(accessToken, expiresIn, null);
    }
}
