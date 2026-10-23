package com.example.passwordmanager.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@ConfigurationProperties(prefix = "app")
public class AppProperties {

    private Jwt jwt = new Jwt();
    private Prelogin prelogin = new Prelogin();
    private Refresh refresh = new Refresh();
    private Cors cors = new Cors();
    private Limits limits = new Limits();

    public static class Jwt {
        private String issuer = "password-manager";
        private int accessTtlMinutes = 15;
        private String secret;

        public String getIssuer() {
            return issuer;
        }

        public void setIssuer(String issuer) {
            this.issuer = issuer;
        }

        public int getAccessTtlMinutes() {
            return accessTtlMinutes;
        }

        public void setAccessTtlMinutes(int accessTtlMinutes) {
            this.accessTtlMinutes = accessTtlMinutes;
        }

        public String getSecret() {
            return secret;
        }

        public void setSecret(String secret) {
            this.secret = secret;
        }
    }

    public static class Prelogin {
        private String secret;

        public String getSecret() {
            return secret;
        }

        public void setSecret(String secret) {
            this.secret = secret;
        }
    }

    public static class Refresh {
        private int ttlDays = 14;
        private int familyMaxDays = 30;
        private String cookieName = "pm_refresh";
        private boolean cookieSecure = true;

        public int getTtlDays() {
            return ttlDays;
        }

        public void setTtlDays(int ttlDays) {
            this.ttlDays = ttlDays;
        }

        public int getFamilyMaxDays() {
            return familyMaxDays;
        }

        public void setFamilyMaxDays(int familyMaxDays) {
            this.familyMaxDays = familyMaxDays;
        }

        public String getCookieName() {
            return cookieName;
        }

        public void setCookieName(String cookieName) {
            this.cookieName = cookieName;
        }

        public boolean isCookieSecure() {
            return cookieSecure;
        }

        public void setCookieSecure(boolean cookieSecure) {
            this.cookieSecure = cookieSecure;
        }
    }

    public static class Cors {
        private List<String> allowedOrigins = List.of("http://localhost:5173", "http://127.0.0.1:5173");

        public List<String> getAllowedOrigins() {
            return allowedOrigins;
        }

        public void setAllowedOrigins(List<String> allowedOrigins) {
            this.allowedOrigins = allowedOrigins;
        }
    }

    public static class Limits {
        private int maxEntriesPerUser = 5000;
        private int maxEntryDataChars = 90000;

        public int getMaxEntriesPerUser() {
            return maxEntriesPerUser;
        }

        public void setMaxEntriesPerUser(int maxEntriesPerUser) {
            this.maxEntriesPerUser = maxEntriesPerUser;
        }

        public int getMaxEntryDataChars() {
            return maxEntryDataChars;
        }

        public void setMaxEntryDataChars(int maxEntryDataChars) {
            this.maxEntryDataChars = maxEntryDataChars;
        }
    }

    public Jwt getJwt() {
        return jwt;
    }

    public void setJwt(Jwt jwt) {
        this.jwt = jwt;
    }

    public Prelogin getPrelogin() {
        return prelogin;
    }

    public void setPrelogin(Prelogin prelogin) {
        this.prelogin = prelogin;
    }

    public Refresh getRefresh() {
        return refresh;
    }

    public void setRefresh(Refresh refresh) {
        this.refresh = refresh;
    }

    public Cors getCors() {
        return cors;
    }

    public void setCors(Cors cors) {
        this.cors = cors;
    }

    public Limits getLimits() {
        return limits;
    }

    public void setLimits(Limits limits) {
        this.limits = limits;
    }
}
