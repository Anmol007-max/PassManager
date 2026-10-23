package com.example.passwordmanager.service;

import com.example.passwordmanager.entity.AuditEvent;
import com.example.passwordmanager.repository.AuditEventRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class AuditService {

    private final AuditEventRepository auditEventRepository;

    public AuditService(AuditEventRepository auditEventRepository) {
        this.auditEventRepository = auditEventRepository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordEvent(UUID userId, String type, String ip, String userAgent) {
        AuditEvent event = new AuditEvent(userId, type, ip, userAgent);
        auditEventRepository.save(event);
    }
}
