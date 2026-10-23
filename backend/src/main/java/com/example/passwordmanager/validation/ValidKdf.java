package com.example.passwordmanager.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.*;

@Documented
@Constraint(validatedBy = ValidKdfValidator.class)
@Target({ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidKdf {
    String message() default "Invalid KDF parameters";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
