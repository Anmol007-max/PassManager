package com.example.passwordmanager.dto.common;

import java.util.UUID;

public record UserSummary(
        UUID id,
        String email
) {
}
