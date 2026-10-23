package com.example.passwordmanager.controller;

import com.example.passwordmanager.dto.common.UserSummary;
import com.example.passwordmanager.security.ClientIpResolver;
import com.example.passwordmanager.security.CurrentUser;
import com.example.passwordmanager.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/me")
public class MeController {

    private final UserService userService;
    private final ClientIpResolver clientIpResolver;

    public MeController(UserService userService, ClientIpResolver clientIpResolver) {
        this.userService = userService;
        this.clientIpResolver = clientIpResolver;
    }

    @GetMapping
    public ResponseEntity<UserSummary> getMe() {
        return ResponseEntity.ok(userService.getMe(CurrentUser.id()));
    }

    public record DeleteAccountRequest(@NotBlank String authKey) {}

    @DeleteMapping
    public ResponseEntity<Void> deleteMe(@RequestBody DeleteAccountRequest request,
                                         HttpServletRequest servletRequest) {
        String ip = clientIpResolver.resolve(servletRequest);
        String userAgent = servletRequest.getHeader(HttpHeaders.USER_AGENT);
        userService.deleteAccount(CurrentUser.id(), request.authKey(), ip, userAgent);
        return ResponseEntity.noContent().build();
    }
}
