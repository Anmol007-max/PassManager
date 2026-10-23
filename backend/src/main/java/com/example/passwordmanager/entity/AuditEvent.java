package com.example.passwordmanager.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "audit_event")
public class AuditEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id")
    private UUID userId;

    @Column(nullable = false, length = 40)
    private String type;

    @Column(length = 64)
    private String ip;

    @Column(name = "user_agent", length = 255)
    private String userAgent;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected AuditEvent() {
    }

    public AuditEvent(UUID userId, String type, String ip, String userAgent) {
        this.userId = userId;
        this.type = type;
        this.ip = ip;
        this.userAgent = userAgent != null && userAgent.length() > 255 ? userAgent.substring(0, 255) : userAgent;
        this.createdAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public String getType() {
        return type;
    }

    public String getIp() {
        return ip;
    }

    public String getUserAgent() {
        return userAgent;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof AuditEvent that)) return false;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }

    @Override
    public String toString() {
        return "AuditEvent{" +
                "id=" + id +
                ", userId=" + userId +
                ", type='" + type + '\'' +
                ", createdAt=" + createdAt +
                '}';
    }
}
