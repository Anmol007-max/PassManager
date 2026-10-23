package com.example.passwordmanager.config;

import com.example.passwordmanager.exception.ErrorCode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.DispatcherType;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.net.URI;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final AppProperties appProperties;
    private final ObjectMapper objectMapper;

    public SecurityConfig(AppProperties appProperties, ObjectMapper objectMapper) {
        this.appProperties = appProperties;
        this.objectMapper = objectMapper;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8();
    }

    @Bean
    public AuthenticationEntryPoint customAuthenticationEntryPoint() {
        return (request, response, authException) -> {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);

            ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                    org.springframework.http.HttpStatus.UNAUTHORIZED,
                    "Authentication required or token expired"
            );
            problem.setType(URI.create("about:blank"));
            problem.setTitle("Unauthorized");
            problem.setProperty("code", ErrorCode.UNAUTHORIZED.name());

            objectMapper.writeValue(response.getOutputStream(), problem);
        };
    }

    @Bean
    public AccessDeniedHandler customAccessDeniedHandler() {
        return (request, response, accessDeniedException) -> {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);

            ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                    org.springframework.http.HttpStatus.FORBIDDEN,
                    "Access denied: " + accessDeniedException.getMessage()
            );
            problem.setType(URI.create("about:blank"));
            problem.setTitle("Forbidden");
            problem.setProperty("code", "FORBIDDEN");

            objectMapper.writeValue(response.getOutputStream(), problem);
        };
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(a -> a
                        .dispatcherTypeMatchers(DispatcherType.ERROR, DispatcherType.FORWARD).permitAll()
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/error").permitAll()
                        .requestMatchers(HttpMethod.POST,
                                "/api/auth/prelogin",
                                "/api/auth/register",
                                "/api/auth/login",
                                "/api/auth/refresh",
                                "/api/auth/logout"
                        ).permitAll()
                        .requestMatchers("/actuator/health").permitAll()
                        .anyRequest().authenticated()
                )
                .oauth2ResourceServer(o -> o
                        .jwt(Customizer.withDefaults())
                        .authenticationEntryPoint(customAuthenticationEntryPoint())
                        .accessDeniedHandler(customAccessDeniedHandler())
                )
                .exceptionHandling(e -> e
                        .authenticationEntryPoint(customAuthenticationEntryPoint())
                        .accessDeniedHandler(customAccessDeniedHandler())
                )
                .headers(h -> h
                        .httpStrictTransportSecurity(hsts -> hsts.includeSubDomains(true).maxAgeInSeconds(31536000))
                        .frameOptions(f -> f.deny())
                        .contentTypeOptions(Customizer.withDefaults())
                        .referrerPolicy(r -> r.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.NO_REFERRER))
                );

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        Set<String> patterns = new LinkedHashSet<>();
        if (appProperties.getCors() != null && appProperties.getCors().getAllowedOrigins() != null) {
            patterns.addAll(appProperties.getCors().getAllowedOrigins());
        }
        patterns.add("http://localhost:*");
        patterns.add("https://localhost:*");
        patterns.add("https://localhost");
        patterns.add("capacitor://localhost");
        patterns.add("https://passmanager.app");
        patterns.add("http://127.0.0.1:*");
        patterns.add("http://[::1]:*");
        patterns.add("http://10.0.2.2:*");
        patterns.add("http://192.168.*:*");

        config.setAllowedOriginPatterns(new ArrayList<>(patterns));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"));
        config.setAllowedHeaders(List.of("*"));
        config.setExposedHeaders(List.of("Set-Cookie", "Retry-After", "X-PM-Refresh-Token"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
