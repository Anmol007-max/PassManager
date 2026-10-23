package com.example.passwordmanager.dto.vault;

import com.example.passwordmanager.validation.EncString;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record VaultEntryCreateRequest(
        @NotNull UUID id,
        @NotNull @EncString String data,
        @NotNull @Min(1) @Max(1) Integer keyVersion
) {
}
