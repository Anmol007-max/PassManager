package com.example.passwordmanager.validation;

import com.example.passwordmanager.dto.auth.KdfParams;
import com.example.passwordmanager.entity.KdfType;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class ValidKdfValidator implements ConstraintValidator<ValidKdf, KdfParams> {

    @Override
    public boolean isValid(KdfParams kdf, ConstraintValidatorContext context) {
        if (kdf == null || kdf.type() == null) {
            return false;
        }

        if (kdf.type() == KdfType.ARGON2ID) {
            if (kdf.iterations() < 2 || kdf.iterations() > 10) {
                return false;
            }
            if (kdf.memoryKib() == null || kdf.memoryKib() < 19456 || kdf.memoryKib() > 262144) {
                return false;
            }
            if (kdf.parallelism() == null || kdf.parallelism() < 1 || kdf.parallelism() > 4) {
                return false;
            }
            return true;
        } else if (kdf.type() == KdfType.PBKDF2) {
            if (kdf.iterations() < 600000 || kdf.iterations() > 2000000) {
                return false;
            }
            if (kdf.memoryKib() != null || kdf.parallelism() != null) {
                return false;
            }
            return true;
        }

        return false;
    }
}
