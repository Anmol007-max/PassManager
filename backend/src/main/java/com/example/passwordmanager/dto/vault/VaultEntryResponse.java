package com.example.passwordmanager.dto.vault;

import java.time.Instant;
import java.util.UUID;

public record VaultEntryResponse(
        UUID id,
        String data,
        int keyVersion,
        long revision,
        Instant createdAt,
        Instant updatedAt
) {
}
