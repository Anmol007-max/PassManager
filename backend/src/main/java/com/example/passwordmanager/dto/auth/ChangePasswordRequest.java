package com.example.passwordmanager.dto.auth;

import com.example.passwordmanager.validation.Base64Bytes;
import com.example.passwordmanager.validation.EncString;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ChangePasswordRequest(
        @NotBlank @Base64Bytes(exactBytes = 32) String currentAuthKey,
        @NotBlank @Base64Bytes(exactBytes = 32) String newAuthKey,
        @NotNull @Valid KdfParams newKdf,
        @NotBlank @EncString(wrappedVaultKey = true) String newWrappedVaultKey
) {
}
