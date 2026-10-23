package com.example.passwordmanager.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;

@Component
public class ClientIpResolver {

    /**
     * Resolves client IP address safely without trusting spoofed X-Forwarded-For headers
     * by default, per BACKEND_DESIGN.md Section 13.
     */
    public String resolve(HttpServletRequest request) {
        if (request == null) {
            return "unknown";
        }
        return request.getRemoteAddr();
    }
}
