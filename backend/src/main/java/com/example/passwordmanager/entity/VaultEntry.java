package com.example.passwordmanager.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "vault_entry")
public class VaultEntry {

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String data;

    @Column(name = "key_version", nullable = false)
    private int keyVersion;

    @Version
    @Column(nullable = false)
    private long revision;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected VaultEntry() {
    }

    public VaultEntry(UUID id, UUID userId, String data, int keyVersion) {
        this.id = id != null ? id : UUID.randomUUID();
        this.userId = userId;
        this.data = data;
        this.keyVersion = keyVersion;
        this.revision = 0;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    public void updateData(String data, Instant now) {
        this.data = data;
        this.updatedAt = now;
    }

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public String getData() {
        return data;
    }

    public int getKeyVersion() {
        return keyVersion;
    }

    public long getRevision() {
        return revision;
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
        if (!(o instanceof VaultEntry that)) return false;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }

    @Override
    public String toString() {
        return "VaultEntry{" +
                "id=" + id +
                ", userId=" + userId +
                ", keyVersion=" + keyVersion +
                ", revision=" + revision +
                ", createdAt=" + createdAt +
                ", updatedAt=" + updatedAt +
                '}';
    }
}
