package com.example.passwordmanager.repository;

import com.example.passwordmanager.entity.VaultEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface VaultEntryRepository extends JpaRepository<VaultEntry, UUID> {
    List<VaultEntry> findAllByUserIdOrderByCreatedAtAsc(UUID userId);
    Optional<VaultEntry> findByIdAndUserId(UUID id, UUID userId);
    long countByUserId(UUID userId);
    long deleteByIdAndUserId(UUID id, UUID userId);
}
