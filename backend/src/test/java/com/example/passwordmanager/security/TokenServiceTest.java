package com.example.passwordmanager.security;

import com.example.passwordmanager.config.AppProperties;
import com.example.passwordmanager.repository.RefreshTokenRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtEncoder;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

class TokenServiceTest {

    private TokenService tokenService;
    private RefreshTokenRepository refreshTokenRepository;
    private JwtEncoder jwtEncoder;

    @BeforeEach
    void setup() {
        jwtEncoder = Mockito.mock(JwtEncoder.class);
        refreshTokenRepository = Mockito.mock(RefreshTokenRepository.class);
        AppProperties appProperties = new AppProperties();
        tokenService = new TokenService(jwtEncoder, appProperties, refreshTokenRepository);
    }

    @Test
    void testTokenHashing() {
        String token = "sample-random-refresh-token-value-12345";
        String hash1 = tokenService.hashToken(token);
        String hash2 = tokenService.hashToken(token);

        assertNotNull(hash1);
        assertEquals(64, hash1.length(), "SHA-256 hex must be 64 characters");
        assertEquals(hash1, hash2);
    }

    @Test
    void testIssueRefreshToken() {
        UUID userId = UUID.randomUUID();
        TokenService.IssuedRefreshToken issued = tokenService.issueRefreshToken(userId, "127.0.0.1", "TestAgent");

        assertNotNull(issued);
        assertNotNull(issued.rawToken());
        assertNotNull(issued.cookie());
        assertEquals("pm_refresh", issued.cookie().getName());
        assertEquals(issued.rawToken(), issued.cookie().getValue());
        assertTrue(issued.cookie().isHttpOnly());
        assertEquals("Strict", issued.cookie().getSameSite());
    }
}
