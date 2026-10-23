package com.example.passwordmanager.dto.auth;

import com.example.passwordmanager.entity.KdfType;
import com.example.passwordmanager.validation.Base64Bytes;
import com.example.passwordmanager.validation.ValidKdf;
import jakarta.validation.constraints.NotNull;

@ValidKdf
public record KdfParams(
        @NotNull KdfType type,
        @NotNull @Base64Bytes(exactBytes = 16) String salt,
        int iterations,
        Integer memoryKib,
        Integer parallelism
) {
}
