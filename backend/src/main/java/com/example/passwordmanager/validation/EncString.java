package com.example.passwordmanager.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.*;

@Documented
@Constraint(validatedBy = EncStringValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
public @interface EncString {
    String message() default "Invalid EncString format";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
    boolean wrappedVaultKey() default false;
    int maxChars() default 90000;
}
