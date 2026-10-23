package com.example.passwordmanager.security;

import com.example.passwordmanager.config.AppProperties;
import com.example.passwordmanager.entity.RefreshToken;
import com.example.passwordmanager.repository.RefreshTokenRepository;
import org.springframework.http.ResponseCookie;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;

@Service
public class TokenService {

    private final JwtEncoder jwtEncoder;
    private final AppProperties appProperties;
    private final RefreshTokenRepository refreshTokenRepository;
    private final SecureRandom secureRandom = new SecureRandom();

    public TokenService(JwtEncoder jwtEncoder,
                        AppProperties appProperties,
                        RefreshTokenRepository refreshTokenRepository) {
        this.jwtEncoder = jwtEncoder;
        this.appProperties = appProperties;
        this.refreshTokenRepository = refreshTokenRepository;
    }

    public String generateAccessToken(UUID userId) {
        Instant now = Instant.now();
        Instant expiresAt = now.plus(appProperties.getJwt().getAccessTtlMinutes(), ChronoUnit.MINUTES);

        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(appProperties.getJwt().getIssuer())
                .issuedAt(now)
                .expiresAt(expiresAt)
                .subject(userId.toString())
                .id(UUID.randomUUID().toString())
                .build();

        return jwtEncoder.encode(JwtEncoderParameters.from(JwsHeader.with(() -> "HS256").build(), claims)).getTokenValue();
    }

    public long getAccessTokenTtlSeconds() {
        return (long) appProperties.getJwt().getAccessTtlMinutes() * 60;
    }

    public record IssuedRefreshToken(String rawToken, RefreshToken entity, ResponseCookie cookie) {}

    public IssuedRefreshToken issueRefreshToken(UUID userId, String ip, String userAgent) {
        UUID familyId = UUID.randomUUID();
        return createRefreshToken(userId, familyId, ip, userAgent, null);
    }

    public IssuedRefreshToken rotateRefreshToken(UUID userId, UUID familyId, Instant familyExpiresAt, String ip, String userAgent) {
        return createRefreshToken(userId, familyId, ip, userAgent, familyExpiresAt);
    }

    private IssuedRefreshToken createRefreshToken(UUID userId, UUID familyId, String ip, String userAgent, Instant existingFamilyExpiresAt) {
        byte[] randomBytes = new byte[32];
        secureRandom.nextBytes(randomBytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
        String tokenHash = hashToken(rawToken);

        Instant now = Instant.now();
        Instant expiresAt = now.plus(appProperties.getRefresh().getTtlDays(), ChronoUnit.DAYS);
        Instant familyExpiresAt = existingFamilyExpiresAt != null
                ? existingFamilyExpiresAt
                : now.plus(appProperties.getRefresh().getFamilyMaxDays(), ChronoUnit.DAYS);

        // expiresAt cannot exceed familyExpiresAt
        if (expiresAt.isAfter(familyExpiresAt)) {
            expiresAt = familyExpiresAt;
        }

        RefreshToken entity = new RefreshToken(
                UUID.randomUUID(),
                userId,
                familyId,
                tokenHash,
                now,
                expiresAt,
                familyExpiresAt,
                userAgent,
                ip
        );

        refreshTokenRepository.save(entity);

        ResponseCookie cookie = buildRefreshCookie(rawToken, Duration.ofDays(appProperties.getRefresh().getTtlDays()));
        return new IssuedRefreshToken(rawToken, entity, cookie);
    }

    public ResponseCookie buildRefreshCookie(String rawToken, Duration maxAge) {
        return ResponseCookie.from(appProperties.getRefresh().getCookieName(), rawToken)
                .httpOnly(true)
                .secure(appProperties.getRefresh().isCookieSecure())
                .path("/api/auth")
                .sameSite("Strict")
                .maxAge(maxAge)
                .build();
    }

    public ResponseCookie buildClearRefreshCookie() {
        return ResponseCookie.from(appProperties.getRefresh().getCookieName(), "")
                .httpOnly(true)
                .secure(appProperties.getRefresh().isCookieSecure())
                .path("/api/auth")
                .sameSite("Strict")
                .maxAge(0)
                .build();
    }

    public String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not available", e);
        }
    }
}
