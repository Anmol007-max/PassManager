package com.example.passwordmanager.dto.auth;

import com.example.passwordmanager.validation.Base64Bytes;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest(
        @NotBlank @Email @Size(max = 254) String email,
        @NotBlank @Base64Bytes(exactBytes = 32) String authKey
) {
}
