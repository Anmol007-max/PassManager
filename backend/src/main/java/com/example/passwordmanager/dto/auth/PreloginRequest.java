package com.example.passwordmanager.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PreloginRequest(
        @NotBlank @Email @Size(max = 254) String email
) {
}
