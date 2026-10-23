package com.example.passwordmanager.dto.vault;

import com.example.passwordmanager.validation.EncString;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

public record VaultEntryUpdateRequest(
        @NotNull @EncString String data,
        @NotNull @PositiveOrZero Long revision
) {
}
