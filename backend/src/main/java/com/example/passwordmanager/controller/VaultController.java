package com.example.passwordmanager.controller;

import com.example.passwordmanager.dto.vault.VaultEntryCreateRequest;
import com.example.passwordmanager.dto.vault.VaultEntryResponse;
import com.example.passwordmanager.dto.vault.VaultEntryUpdateRequest;
import com.example.passwordmanager.dto.vault.VaultListResponse;
import com.example.passwordmanager.security.CurrentUser;
import com.example.passwordmanager.service.VaultService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/vault")
public class VaultController {

    private final VaultService vaultService;

    public VaultController(VaultService vaultService) {
        this.vaultService = vaultService;
    }

    @GetMapping
    public ResponseEntity<VaultListResponse> listEntries() {
        VaultListResponse response = vaultService.listEntries(CurrentUser.id());
        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<VaultEntryResponse> createEntry(@Valid @RequestBody VaultEntryCreateRequest request) {
        VaultEntryResponse response = vaultService.createEntry(CurrentUser.id(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<VaultEntryResponse> updateEntry(@PathVariable UUID id,
                                                          @Valid @RequestBody VaultEntryUpdateRequest request) {
        VaultEntryResponse response = vaultService.updateEntry(CurrentUser.id(), id, request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEntry(@PathVariable UUID id) {
        vaultService.deleteEntry(CurrentUser.id(), id);
        return ResponseEntity.noContent().build();
    }
}
