package com.example.passwordmanager.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import java.util.regex.Pattern;

public class EncStringValidator implements ConstraintValidator<EncString, String> {

    // Pattern for wrapped vault key: 32 bytes key + 16 bytes tag = 48 bytes -> exactly 64 base64 chars
    private static final Pattern WRAPPED_VAULT_KEY_PATTERN =
            Pattern.compile("^v1\\.[A-Za-z0-9+/]{16}\\.[A-Za-z0-9+/]{64}$");

    // Pattern for generic entry data: at least 16 bytes tag -> at least 22 base64 chars
    private static final Pattern ENTRY_DATA_PATTERN =
            Pattern.compile("^v1\\.[A-Za-z0-9+/]{16}\\.[A-Za-z0-9+/]{22,}={0,2}$");

    private boolean isWrappedVaultKey;
    private int maxChars;

    @Override
    public void initialize(EncString constraintAnnotation) {
        this.isWrappedVaultKey = constraintAnnotation.wrappedVaultKey();
        this.maxChars = constraintAnnotation.maxChars();
    }

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null) {
            return false;
        }

        if (value.length() > maxChars) {
            return false;
        }

        if (isWrappedVaultKey) {
            return WRAPPED_VAULT_KEY_PATTERN.matcher(value).matches();
        } else {
            return ENTRY_DATA_PATTERN.matcher(value).matches();
        }
    }
}
