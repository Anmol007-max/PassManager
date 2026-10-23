package com.example.passwordmanager.config;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.proc.SecurityContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.util.Base64;

@Configuration
public class JwtConfig {

    private final AppProperties appProperties;

    public JwtConfig(AppProperties appProperties) {
        this.appProperties = appProperties;
    }

    private SecretKey getSecretKey() {
        String secretB64 = appProperties.getJwt().getSecret();
        if (secretB64 == null || secretB64.isBlank()) {
            throw new IllegalStateException("JWT_SECRET is missing. Cannot start application.");
        }
        byte[] secretBytes;
        try {
            secretBytes = Base64.getDecoder().decode(secretB64);
        } catch (IllegalArgumentException e) {
            throw new IllegalStateException("JWT_SECRET must be valid base64.", e);
        }
        if (secretBytes.length < 32) {
            throw new IllegalStateException("JWT_SECRET must decode to at least 32 bytes (got " + secretBytes.length + ").");
        }
        return new SecretKeySpec(secretBytes, "HmacSHA256");
    }

    @Bean
    public JwtEncoder jwtEncoder() {
        SecretKey key = getSecretKey();
        JWKSource<SecurityContext> jwkSource = new ImmutableSecret<>(key);
        return new NimbusJwtEncoder(jwkSource);
    }

    @Bean
    public JwtDecoder jwtDecoder() {
        SecretKey key = getSecretKey();
        return NimbusJwtDecoder.withSecretKey(key).build();
    }
}
