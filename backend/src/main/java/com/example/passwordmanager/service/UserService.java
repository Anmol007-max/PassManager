package com.example.passwordmanager.service;

import com.example.passwordmanager.dto.common.UserSummary;
import com.example.passwordmanager.entity.User;
import com.example.passwordmanager.exception.ApiException;
import com.example.passwordmanager.exception.ErrorCode;
import com.example.passwordmanager.repository.RefreshTokenRepository;
import com.example.passwordmanager.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;

    public UserService(UserRepository userRepository,
                       RefreshTokenRepository refreshTokenRepository,
                       PasswordEncoder passwordEncoder,
                       AuditService auditService) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public UserSummary getMe(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(ErrorCode.ENTRY_NOT_FOUND, HttpStatus.NOT_FOUND, "User not found"));
        return new UserSummary(user.getId(), user.getEmail());
    }

    @Transactional
    public void deleteAccount(UUID userId, String authKey, String ip, String userAgent) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(ErrorCode.ENTRY_NOT_FOUND, HttpStatus.NOT_FOUND, "User not found"));

        if (!passwordEncoder.matches(authKey, user.getAuthHash())) {
            throw new ApiException(ErrorCode.INVALID_CREDENTIALS, HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        refreshTokenRepository.revokeAllByUserId(userId, Instant.now());
        userRepository.delete(user);
        auditService.recordEvent(userId, "ACCOUNT_DELETED", ip, userAgent);
    }
}
