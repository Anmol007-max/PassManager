package com.example.passwordmanager.entity;

import jakarta.persistence.*;
import java.time.Duration;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "users")
public class User {

    @Id
    private UUID id;

    @Column(nullable = false, unique = true, length = 254)
    private String email;

    @Column(name = "auth_hash", nullable = false, length = 255)
    private String authHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "kdf_type", nullable = false, length = 16)
    private KdfType kdfType;

    @Column(name = "kdf_salt", nullable = false, length = 24)
    private String kdfSalt;

    @Column(name = "kdf_iterations", nullable = false)
    private int kdfIterations;

    @Column(name = "kdf_memory_kib")
    private Integer kdfMemoryKib;

    @Column(name = "kdf_parallelism")
    private Integer kdfParallelism;

    @Column(name = "wrapped_vault_key", nullable = false, columnDefinition = "TEXT")
    private String wrappedVaultKey;

    @Column(name = "failed_login_attempts", nullable = false)
    private int failedLoginAttempts;

    @Column(name = "locked_until")
    private Instant lockedUntil;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected User() {
    }

    public User(UUID id, String email, String authHash, KdfType kdfType, String kdfSalt,
                int kdfIterations, Integer kdfMemoryKib, Integer kdfParallelism,
                String wrappedVaultKey) {
        this.id = id != null ? id : UUID.randomUUID();
        this.email = email.toLowerCase();
        this.authHash = authHash;
        this.kdfType = kdfType;
        this.kdfSalt = kdfSalt;
        this.kdfIterations = kdfIterations;
        this.kdfMemoryKib = kdfMemoryKib;
        this.kdfParallelism = kdfParallelism;
        this.wrappedVaultKey = wrappedVaultKey;
        this.failedLoginAttempts = 0;
        this.lockedUntil = null;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    public boolean isLocked(Instant now) {
        return lockedUntil != null && lockedUntil.isAfter(now);
    }

    public void registerFailedLogin(Instant now, int maxAttempts, Duration lockoutDuration) {
        this.failedLoginAttempts++;
        if (this.failedLoginAttempts >= maxAttempts) {
            this.lockedUntil = now.plus(lockoutDuration);
            this.failedLoginAttempts = 0;
        }
        this.updatedAt = now;
    }

    public void resetFailedLogins(Instant now) {
        this.failedLoginAttempts = 0;
        this.lockedUntil = null;
        this.updatedAt = now;
    }

    public void updatePassword(String newAuthHash, KdfType kdfType, String kdfSalt,
                               int kdfIterations, Integer kdfMemoryKib, Integer kdfParallelism,
                               String newWrappedVaultKey, Instant now) {
        this.authHash = newAuthHash;
        this.kdfType = kdfType;
        this.kdfSalt = kdfSalt;
        this.kdfIterations = kdfIterations;
        this.kdfMemoryKib = kdfMemoryKib;
        this.kdfParallelism = kdfParallelism;
        this.wrappedVaultKey = newWrappedVaultKey;
        this.updatedAt = now;
    }

    public void updateAuthHash(String newAuthHash, Instant now) {
        this.authHash = newAuthHash;
        this.updatedAt = now;
    }

    public UUID getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public String getAuthHash() {
        return authHash;
    }

    public KdfType getKdfType() {
        return kdfType;
    }

    public String getKdfSalt() {
        return kdfSalt;
    }

    public int getKdfIterations() {
        return kdfIterations;
    }

    public Integer getKdfMemoryKib() {
        return kdfMemoryKib;
    }

    public Integer getKdfParallelism() {
        return kdfParallelism;
    }

    public String getWrappedVaultKey() {
        return wrappedVaultKey;
    }

    public int getFailedLoginAttempts() {
        return failedLoginAttempts;
    }

    public Instant getLockedUntil() {
        return lockedUntil;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof User user)) return false;
        return Objects.equals(id, user.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }

    @Override
    public String toString() {
        return "User{" +
                "id=" + id +
                ", email='" + email + '\'' +
                ", kdfType=" + kdfType +
                ", createdAt=" + createdAt +
                '}';
    }
}
