package com.example.passwordmanager.service;

import com.example.passwordmanager.config.AppProperties;
import com.example.passwordmanager.dto.vault.VaultEntryCreateRequest;
import com.example.passwordmanager.dto.vault.VaultEntryResponse;
import com.example.passwordmanager.dto.vault.VaultEntryUpdateRequest;
import com.example.passwordmanager.dto.vault.VaultListResponse;
import com.example.passwordmanager.entity.VaultEntry;
import com.example.passwordmanager.exception.ApiException;
import com.example.passwordmanager.exception.ErrorCode;
import com.example.passwordmanager.repository.VaultEntryRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class VaultService {

    private final VaultEntryRepository vaultEntryRepository;
    private final AppProperties appProperties;

    public VaultService(VaultEntryRepository vaultEntryRepository, AppProperties appProperties) {
        this.vaultEntryRepository = vaultEntryRepository;
        this.appProperties = appProperties;
    }

    @Transactional(readOnly = true)
    public VaultListResponse listEntries(UUID userId) {
        List<VaultEntryResponse> responses = vaultEntryRepository.findAllByUserIdOrderByCreatedAtAsc(userId)
                .stream()
                .map(this::mapToResponse)
                .toList();

        return new VaultListResponse(responses);
    }

    @Transactional
    public VaultEntryResponse createEntry(UUID userId, VaultEntryCreateRequest request) {
        long currentCount = vaultEntryRepository.countByUserId(userId);
        if (currentCount >= appProperties.getLimits().getMaxEntriesPerUser()) {
            throw new ApiException(ErrorCode.VAULT_LIMIT_REACHED, HttpStatus.UNPROCESSABLE_ENTITY, "Vault entry quota exceeded");
        }

        if (vaultEntryRepository.existsById(request.id())) {
            throw new ApiException(ErrorCode.ENTRY_EXISTS, HttpStatus.CONFLICT, "Entry already exists");
        }

        VaultEntry entry = new VaultEntry(request.id(), userId, request.data(), request.keyVersion());
        VaultEntry saved = vaultEntryRepository.save(entry);
        return mapToResponse(saved);
    }

    @Transactional
    public VaultEntryResponse updateEntry(UUID userId, UUID id, VaultEntryUpdateRequest request) {
        VaultEntry entry = vaultEntryRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ApiException(ErrorCode.ENTRY_NOT_FOUND, HttpStatus.NOT_FOUND, "Entry not found"));

        if (entry.getRevision() != request.revision()) {
            throw new ApiException(ErrorCode.REVISION_CONFLICT, HttpStatus.CONFLICT, "Revision conflict");
        }

        entry.updateData(request.data(), Instant.now());
        VaultEntry saved = vaultEntryRepository.saveAndFlush(entry);
        return mapToResponse(saved);
    }

    @Transactional
    public void deleteEntry(UUID userId, UUID id) {
        long deleted = vaultEntryRepository.deleteByIdAndUserId(id, userId);
        if (deleted == 0) {
            throw new ApiException(ErrorCode.ENTRY_NOT_FOUND, HttpStatus.NOT_FOUND, "Entry not found");
        }
    }

    private VaultEntryResponse mapToResponse(VaultEntry entity) {
        return new VaultEntryResponse(
                entity.getId(),
                entity.getData(),
                entity.getKeyVersion(),
                entity.getRevision(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
