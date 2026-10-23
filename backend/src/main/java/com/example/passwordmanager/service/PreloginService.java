package com.example.passwordmanager.service;

import com.example.passwordmanager.config.AppProperties;
import com.example.passwordmanager.dto.auth.KdfParams;
import com.example.passwordmanager.dto.auth.PreloginResponse;
import com.example.passwordmanager.entity.KdfType;
import com.example.passwordmanager.entity.User;
import com.example.passwordmanager.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.util.Arrays;
import java.util.Base64;
import java.util.Locale;
import java.util.Optional;

@Service
public class PreloginService {

    private final UserRepository userRepository;
    private final byte[] preloginSecretBytes;

    public PreloginService(UserRepository userRepository, AppProperties appProperties) {
        this.userRepository = userRepository;
        String secretB64 = appProperties.getPrelogin().getSecret();
        if (secretB64 == null || secretB64.isBlank()) {
            throw new IllegalStateException("PRELOGIN_SECRET is missing.");
        }
        try {
            this.preloginSecretBytes = Base64.getDecoder().decode(secretB64);
        } catch (IllegalArgumentException e) {
            throw new IllegalStateException("PRELOGIN_SECRET must be valid base64.", e);
        }
        if (this.preloginSecretBytes.length < 32) {
            throw new IllegalStateException("PRELOGIN_SECRET must decode to at least 32 bytes.");
        }
    }

    @Transactional(readOnly = true)
    public PreloginResponse getPreloginParams(String rawEmail) {
        String normalizedEmail = rawEmail.trim().toLowerCase(Locale.ROOT);
        Optional<User> userOpt = userRepository.findByEmail(normalizedEmail);

        if (userOpt.isPresent()) {
            User user = userOpt.get();
            KdfParams params = new KdfParams(
                    user.getKdfType(),
                    user.getKdfSalt(),
                    user.getKdfIterations(),
                    user.getKdfMemoryKib(),
                    user.getKdfParallelism()
            );
            return new PreloginResponse(params);
        } else {
            String fakeSalt = generateDeterministicFakeSalt(normalizedEmail);
            KdfParams fakeParams = new KdfParams(
                    KdfType.ARGON2ID,
                    fakeSalt,
                    3,
                    65536,
                    1
            );
            return new PreloginResponse(fakeParams);
        }
    }

    public String generateDeterministicFakeSalt(String normalizedEmail) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec keySpec = new SecretKeySpec(preloginSecretBytes, "HmacSHA256");
            mac.init(keySpec);
            byte[] hmac = mac.doFinal(normalizedEmail.getBytes(StandardCharsets.UTF_8));
            byte[] saltBytes = Arrays.copyOf(hmac, 16);
            return Base64.getEncoder().encodeToString(saltBytes);
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new RuntimeException("Failed to generate deterministic salt", e);
        }
    }
}
