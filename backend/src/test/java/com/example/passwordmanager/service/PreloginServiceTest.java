package com.example.passwordmanager.service;

import com.example.passwordmanager.config.AppProperties;
import com.example.passwordmanager.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import static org.junit.jupiter.api.Assertions.*;

class PreloginServiceTest {

    private PreloginService preloginService;

    @BeforeEach
    void setup() {
        UserRepository userRepository = Mockito.mock(UserRepository.class);
        AppProperties appProperties = new AppProperties();
        appProperties.getPrelogin().setSecret("YW5vdGhlcnZlcnlsb25nYW5kc2VjdXJlcHJlbG9naW5zZWNyZXRmb3JobWFjMTIzNDU2Nzg5MA==");
        preloginService = new PreloginService(userRepository, appProperties);
    }

    @Test
    void testDeterministicFakeSalt() {
        String email1 = "testuser@example.com";
        String email2 = "otheruser@example.com";

        String salt1 = preloginService.generateDeterministicFakeSalt(email1);
        String salt1Repeat = preloginService.generateDeterministicFakeSalt(email1);
        String salt2 = preloginService.generateDeterministicFakeSalt(email2);

        assertNotNull(salt1);
        assertEquals(salt1, salt1Repeat, "Same email must produce identical fake salt");
        assertNotEquals(salt1, salt2, "Different email must produce different fake salt");
    }
}
