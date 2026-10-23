package com.example.passwordmanager.validation;

import com.example.passwordmanager.dto.auth.KdfParams;
import com.example.passwordmanager.entity.KdfType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ValidationTests {

    private ValidKdfValidator kdfValidator;
    private EncStringValidator encStringValidator;
    private EncStringValidator wrappedKeyValidator;

    @BeforeEach
    void setup() {
        kdfValidator = new ValidKdfValidator();
        encStringValidator = new EncStringValidator();
        encStringValidator.initialize(createEncStringAnnotation(false, 90000));

        wrappedKeyValidator = new EncStringValidator();
        wrappedKeyValidator.initialize(createEncStringAnnotation(true, 90000));
    }

    private EncString createEncStringAnnotation(boolean wrapped, int max) {
        return new EncString() {
            @Override
            public Class<? extends java.lang.annotation.Annotation> annotationType() {
                return EncString.class;
            }
            @Override
            public String message() { return ""; }
            @Override
            public Class<?>[] groups() { return new Class<?>[0]; }
            @Override
            public Class<? extends jakarta.validation.Payload>[] payload() { return new Class[0]; }
            @Override
            public boolean wrappedVaultKey() { return wrapped; }
            @Override
            public int maxChars() { return max; }
        };
    }

    @Test
    void testValidArgon2Params() {
        KdfParams valid = new KdfParams(KdfType.ARGON2ID, "AAAAAAAAAAAAAAAAAAAAAA==", 3, 65536, 1);
        assertTrue(kdfValidator.isValid(valid, null));

        // Weak iterations
        KdfParams lowIter = new KdfParams(KdfType.ARGON2ID, "AAAAAAAAAAAAAAAAAAAAAA==", 1, 65536, 1);
        assertFalse(kdfValidator.isValid(lowIter, null));

        // Weak memory
        KdfParams lowMem = new KdfParams(KdfType.ARGON2ID, "AAAAAAAAAAAAAAAAAAAAAA==", 3, 1024, 1);
        assertFalse(kdfValidator.isValid(lowMem, null));
    }

    @Test
    void testValidPbkdf2Params() {
        KdfParams valid = new KdfParams(KdfType.PBKDF2, "AAAAAAAAAAAAAAAAAAAAAA==", 600000, null, null);
        assertTrue(kdfValidator.isValid(valid, null));

        // Too low iterations (< 600,000)
        KdfParams lowIter = new KdfParams(KdfType.PBKDF2, "AAAAAAAAAAAAAAAAAAAAAA==", 100000, null, null);
        assertFalse(kdfValidator.isValid(lowIter, null));

        // PBKDF2 must not have memory or parallelism
        KdfParams withMem = new KdfParams(KdfType.PBKDF2, "AAAAAAAAAAAAAAAAAAAAAA==", 600000, 65536, null);
        assertFalse(kdfValidator.isValid(withMem, null));
    }

    @Test
    void testEncStringFormat() {
        // Valid wrapped vault key (16 base64 chars for 12-byte IV + 64 base64 chars for 48 bytes ct+tag)
        String validWrapped = "v1.MDEyMzQ1Njc4OWFi.MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWYwMTIzNDU2Nzg5YWJjZGVm";
        assertTrue(wrappedKeyValidator.isValid(validWrapped, null));

        // Invalid wrapped key length
        String shortWrapped = "v1.MDEyMzQ1Njc4OWFi.MDEyMzQ1";
        assertFalse(wrappedKeyValidator.isValid(shortWrapped, null));

        // Valid entry data
        String validData = "v1.MDEyMzQ1Njc4OWFi.MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=";
        assertTrue(encStringValidator.isValid(validData, null));

        // Missing v1 prefix
        assertFalse(encStringValidator.isValid("v2.MDEyMzQ1Njc4OWFi.MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=", null));
    }
}
