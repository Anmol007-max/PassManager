package com.example.passwordmanager.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import java.util.Base64;

public class Base64BytesValidator implements ConstraintValidator<Base64Bytes, String> {

    private int exactBytes;

    @Override
    public void initialize(Base64Bytes constraintAnnotation) {
        this.exactBytes = constraintAnnotation.exactBytes();
    }

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null) {
            return false;
        }
        try {
            byte[] decoded = Base64.getDecoder().decode(value);
            if (exactBytes > 0 && decoded.length != exactBytes) {
                return false;
            }
            return true;
        } catch (IllegalArgumentException e) {
            return false;
        }
    }
}
