package com.example.passwordmanager.security;

import com.example.passwordmanager.exception.ApiException;
import com.example.passwordmanager.exception.ErrorCode;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.concurrent.TimeUnit;

@Component
public class RateLimiter {

    private final Cache<String, Bucket> buckets = Caffeine.newBuilder()
            .expireAfterAccess(1, TimeUnit.HOURS)
            .maximumSize(50_000)
            .build();

    public void checkLoginIp(String ip) {
        checkBucket("login:ip:" + ip, 20, Duration.ofMinutes(1));
    }

    public void checkLoginIpAndEmail(String ip, String email) {
        checkBucket("login:ip_email:" + ip + ":" + email.toLowerCase(), 5, Duration.ofMinutes(1));
    }

    public void checkPreloginIp(String ip) {
        checkBucket("prelogin:ip:" + ip, 30, Duration.ofMinutes(1));
    }

    public void checkRegisterIp(String ip) {
        checkBucket("register:ip:" + ip, 5, Duration.ofHours(1));
    }

    public void checkChangePasswordUser(String userId) {
        checkBucket("changepw:user:" + userId, 5, Duration.ofHours(1));
    }

    public void checkRefreshIp(String ip) {
        checkBucket("refresh:ip:" + ip, 60, Duration.ofMinutes(1));
    }

    private void checkBucket(String key, long capacity, Duration refillDuration) {
        Bucket bucket = buckets.get(key, k -> Bucket.builder()
                .addLimit(Bandwidth.builder().capacity(capacity).refillGreedy(capacity, refillDuration).build())
                .build());

        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        if (!probe.isConsumed()) {
            long waitSeconds = TimeUnit.NANOSECONDS.toSeconds(probe.getNanosToWaitForRefill()) + 1;
            throw new RateLimitException(waitSeconds);
        }
    }

    public static class RateLimitException extends ApiException {
        private final long retryAfterSeconds;

        public RateLimitException(long retryAfterSeconds) {
            super(ErrorCode.RATE_LIMITED, HttpStatus.TOO_MANY_REQUESTS, "Rate limit exceeded. Please try again later.");
            this.retryAfterSeconds = retryAfterSeconds;
        }

        public long getRetryAfterSeconds() {
            return retryAfterSeconds;
        }
    }
}
