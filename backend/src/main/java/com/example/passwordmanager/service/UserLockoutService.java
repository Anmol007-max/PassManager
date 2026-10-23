package com.example.passwordmanager.service;

import com.example.passwordmanager.entity.User;
import com.example.passwordmanager.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Service
public class UserLockoutService {

    private final UserRepository userRepository;
    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final Duration LOCKOUT_DURATION = Duration.ofMinutes(15);

    public UserLockoutService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordFailedAttempt(UUID userId, Instant now) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            user.registerFailedLogin(now, MAX_FAILED_ATTEMPTS, LOCKOUT_DURATION);
            userRepository.save(user);
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void resetFailedAttempts(UUID userId, Instant now) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            user.resetFailedLogins(now);
            userRepository.save(user);
        }
    }
}
