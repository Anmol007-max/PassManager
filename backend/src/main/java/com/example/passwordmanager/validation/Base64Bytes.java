package com.example.passwordmanager.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.*;

@Documented
@Constraint(validatedBy = Base64BytesValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
public @interface Base64Bytes {
    String message() default "Invalid base64 byte sequence";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
    int exactBytes() default -1;
}
