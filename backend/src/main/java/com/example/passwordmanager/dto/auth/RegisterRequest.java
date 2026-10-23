package com.example.passwordmanager.dto.auth;

import com.example.passwordmanager.validation.Base64Bytes;
import com.example.passwordmanager.validation.EncString;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank @Email @Size(max = 254) String email,
        @NotBlank @Base64Bytes(exactBytes = 32) String authKey,
        @NotNull @Valid KdfParams kdf,
        @NotBlank @EncString(wrappedVaultKey = true) String wrappedVaultKey
) {
}
