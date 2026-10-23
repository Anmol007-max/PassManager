package com.example.passwordmanager.service;

import com.example.passwordmanager.dto.auth.*;
import com.example.passwordmanager.dto.common.UserSummary;
import com.example.passwordmanager.entity.RefreshToken;
import com.example.passwordmanager.entity.User;
import com.example.passwordmanager.exception.ApiException;
import com.example.passwordmanager.exception.ErrorCode;
import com.example.passwordmanager.repository.RefreshTokenRepository;
import com.example.passwordmanager.repository.UserRepository;
import com.example.passwordmanager.security.RateLimiter;
import com.example.passwordmanager.security.TokenService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final TokenService tokenService;
    private final AuditService auditService;
    private final UserLockoutService userLockoutService;
    private final RateLimiter rateLimiter;
    private final PasswordEncoder passwordEncoder;
    private final String dummyHash;

    public AuthService(UserRepository userRepository,
                       RefreshTokenRepository refreshTokenRepository,
                       TokenService tokenService,
                       AuditService auditService,
                       UserLockoutService userLockoutService,
                       RateLimiter rateLimiter,
                       PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.tokenService = tokenService;
        this.auditService = auditService;
        this.userLockoutService = userLockoutService;
        this.rateLimiter = rateLimiter;
        this.passwordEncoder = passwordEncoder;

        // DUMMY_HASH generated once at startup for constant-time email enumeration resistance
        byte[] randomBytes = new byte[32];
        new SecureRandom().nextBytes(randomBytes);
        this.dummyHash = this.passwordEncoder.encode(Base64.getEncoder().encodeToString(randomBytes));
    }

    public record LoginResult(LoginResponse response, ResponseCookie refreshCookie, String rawRefreshToken) {
        public LoginResult(LoginResponse response, ResponseCookie refreshCookie) {
            this(response, refreshCookie, null);
        }
    }
    public record RefreshResult(RefreshResponse response, ResponseCookie refreshCookie, String rawRefreshToken) {
        public RefreshResult(RefreshResponse response, ResponseCookie refreshCookie) {
            this(response, refreshCookie, null);
        }
    }

    @Transactional
    public UserSummary register(RegisterRequest request, String ip, String userAgent) {
        rateLimiter.checkRegisterIp(ip);
        String normalizedEmail = request.email().trim().toLowerCase(Locale.ROOT);

        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new ApiException(ErrorCode.EMAIL_TAKEN, HttpStatus.CONFLICT, "Email is already registered");
        }

        String authHash = passwordEncoder.encode(request.authKey());

        User user = new User(
                UUID.randomUUID(),
                normalizedEmail,
                authHash,
                request.kdf().type(),
                request.kdf().salt(),
                request.kdf().iterations(),
                request.kdf().memoryKib(),
                request.kdf().parallelism(),
                request.wrappedVaultKey()
        );

        userRepository.save(user);
        auditService.recordEvent(user.getId(), "REGISTER", ip, userAgent);

        return new UserSummary(user.getId(), user.getEmail());
    }

    public LoginResult login(LoginRequest request, String ip, String userAgent) {
        rateLimiter.checkLoginIp(ip);
        rateLimiter.checkLoginIpAndEmail(ip, request.email());

        String normalizedEmail = request.email().trim().toLowerCase(Locale.ROOT);
        Optional<User> userOpt = userRepository.findByEmail(normalizedEmail);
        Instant now = Instant.now();

        String hashToCheck = userOpt.isPresent() ? userOpt.get().getAuthHash() : dummyHash;

        if (userOpt.isPresent() && userOpt.get().isLocked(now)) {
            passwordEncoder.matches(request.authKey(), dummyHash);
            auditService.recordEvent(userOpt.get().getId(), "LOGIN_FAILURE", ip, userAgent);
            throw new ApiException(ErrorCode.INVALID_CREDENTIALS, HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        boolean matches = passwordEncoder.matches(request.authKey(), hashToCheck);
        if (!matches || userOpt.isEmpty()) {
            userOpt.ifPresent(user -> userLockoutService.recordFailedAttempt(user.getId(), now));
            auditService.recordEvent(userOpt.map(User::getId).orElse(null), "LOGIN_FAILURE", ip, userAgent);
            throw new ApiException(ErrorCode.INVALID_CREDENTIALS, HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        User user = userOpt.get();
        userLockoutService.resetFailedAttempts(user.getId(), now);

        if (passwordEncoder.upgradeEncoding(user.getAuthHash())) {
            user.updateAuthHash(passwordEncoder.encode(request.authKey()), now);
            userRepository.save(user);
        }

        String accessToken = tokenService.generateAccessToken(user.getId());
        TokenService.IssuedRefreshToken issuedRefresh = tokenService.issueRefreshToken(user.getId(), ip, userAgent);
        auditService.recordEvent(user.getId(), "LOGIN_SUCCESS", ip, userAgent);

        LoginResponse response = new LoginResponse(
                accessToken,
                tokenService.getAccessTokenTtlSeconds(),
                new UserSummary(user.getId(), user.getEmail()),
                user.getWrappedVaultKey()
        );

        return new LoginResult(response, issuedRefresh.cookie(), issuedRefresh.rawToken());
    }

    @Transactional
    public RefreshResult rotateToken(String rawToken, String ip, String userAgent) {
        rateLimiter.checkRefreshIp(ip);

        if (rawToken == null || rawToken.isBlank()) {
            throw new ApiException(ErrorCode.INVALID_REFRESH, HttpStatus.UNAUTHORIZED, "Refresh token is missing");
        }

        String tokenHash = tokenService.hashToken(rawToken);
        RefreshToken token = refreshTokenRepository.findByTokenHashWithLock(tokenHash)
                .orElseThrow(() -> new ApiException(ErrorCode.INVALID_REFRESH, HttpStatus.UNAUTHORIZED, "Invalid refresh token"));

        Instant now = Instant.now();

        if (token.isRevoked() || token.isExpired(now)) {
            throw new ApiException(ErrorCode.INVALID_REFRESH, HttpStatus.UNAUTHORIZED, "Refresh token is expired or revoked");
        }

        if (token.isUsed()) {
            // Token reuse detected! Revoke entire family!
            refreshTokenRepository.revokeFamily(token.getFamilyId(), now);
            auditService.recordEvent(token.getUserId(), "REFRESH_REUSE_DETECTED", ip, userAgent);
            throw new ApiException(ErrorCode.INVALID_REFRESH, HttpStatus.UNAUTHORIZED, "Refresh token reuse detected");
        }

        token.markUsed(now);
        refreshTokenRepository.save(token);

        TokenService.IssuedRefreshToken rotated = tokenService.rotateRefreshToken(
                token.getUserId(),
                token.getFamilyId(),
                token.getFamilyExpiresAt(),
                ip,
                userAgent
        );

        String newAccessToken = tokenService.generateAccessToken(token.getUserId());
        RefreshResponse response = new RefreshResponse(newAccessToken, tokenService.getAccessTokenTtlSeconds());

        return new RefreshResult(response, rotated.cookie(), rotated.rawToken());
    }

    @Transactional
    public ResponseCookie logout(String rawToken, String ip, String userAgent) {
        if (rawToken != null && !rawToken.isBlank()) {
            String tokenHash = tokenService.hashToken(rawToken);
            Optional<RefreshToken> tokenOpt = refreshTokenRepository.findByTokenHash(tokenHash);
            if (tokenOpt.isPresent()) {
                RefreshToken token = tokenOpt.get();
                refreshTokenRepository.revokeFamily(token.getFamilyId(), Instant.now());
                auditService.recordEvent(token.getUserId(), "LOGOUT", ip, userAgent);
            }
        }
        return tokenService.buildClearRefreshCookie();
    }

    @Transactional
    public void changePassword(UUID userId, ChangePasswordRequest request, String ip, String userAgent) {
        rateLimiter.checkChangePasswordUser(userId.toString());
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(ErrorCode.ENTRY_NOT_FOUND, HttpStatus.NOT_FOUND, "User not found"));

        Instant now = Instant.now();
        if (user.isLocked(now)) {
            throw new ApiException(ErrorCode.INVALID_CREDENTIALS, HttpStatus.UNAUTHORIZED, "Account is temporarily locked");
        }

        if (!passwordEncoder.matches(request.currentAuthKey(), user.getAuthHash())) {
            userLockoutService.recordFailedAttempt(user.getId(), now);
            auditService.recordEvent(user.getId(), "LOGIN_FAILURE", ip, userAgent);
            throw new ApiException(ErrorCode.INVALID_CREDENTIALS, HttpStatus.UNAUTHORIZED, "Invalid current credentials");
        }

        String newAuthHash = passwordEncoder.encode(request.newAuthKey());
        user.updatePassword(
                newAuthHash,
                request.newKdf().type(),
                request.newKdf().salt(),
                request.newKdf().iterations(),
                request.newKdf().memoryKib(),
                request.newKdf().parallelism(),
                request.newWrappedVaultKey(),
                now
        );
        userRepository.save(user);

        // Revoke all refresh tokens
        refreshTokenRepository.revokeAllByUserId(userId, now);
        auditService.recordEvent(userId, "PASSWORD_CHANGED", ip, userAgent);
    }
}
