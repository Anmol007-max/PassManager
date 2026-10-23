package com.example.passwordmanager.dto.vault;

import java.util.List;

public record VaultListResponse(
        List<VaultEntryResponse> entries
) {
}
