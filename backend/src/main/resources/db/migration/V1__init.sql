CREATE TABLE users (
    id                    UUID PRIMARY KEY,
    email                 VARCHAR(254) NOT NULL,
    auth_hash             VARCHAR(255) NOT NULL,
    kdf_type              VARCHAR(16)  NOT NULL,
    kdf_salt              VARCHAR(24)  NOT NULL,
    kdf_iterations        INTEGER      NOT NULL,
    kdf_memory_kib        INTEGER,
    kdf_parallelism       INTEGER,
    wrapped_vault_key     TEXT         NOT NULL,
    failed_login_attempts INTEGER      NOT NULL DEFAULT 0,
    locked_until          TIMESTAMPTZ,
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_users_email_lower CHECK (email = lower(email)),
    CONSTRAINT ck_users_kdf_type CHECK (kdf_type IN ('ARGON2ID','PBKDF2'))
);
CREATE UNIQUE INDEX ux_users_email ON users (email);

CREATE TABLE vault_entry (
    id          UUID PRIMARY KEY,
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    data        TEXT        NOT NULL,
    key_version INTEGER     NOT NULL DEFAULT 1,
    revision    BIGINT      NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_vault_entry_user ON vault_entry (user_id);

CREATE TABLE refresh_token (
    id                UUID PRIMARY KEY,
    user_id           UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    family_id         UUID        NOT NULL,
    token_hash        VARCHAR(64) NOT NULL,
    issued_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at        TIMESTAMPTZ NOT NULL,
    family_expires_at TIMESTAMPTZ NOT NULL,
    used_at           TIMESTAMPTZ,
    revoked_at        TIMESTAMPTZ,
    user_agent        VARCHAR(255),
    ip                VARCHAR(64)
);
CREATE UNIQUE INDEX ux_refresh_token_hash ON refresh_token (token_hash);
CREATE INDEX ix_refresh_token_family ON refresh_token (family_id);
CREATE INDEX ix_refresh_token_user ON refresh_token (user_id);

CREATE TABLE audit_event (
    id         BIGSERIAL PRIMARY KEY,
    user_id    UUID,
    type       VARCHAR(40) NOT NULL,
    ip         VARCHAR(64),
    user_agent VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_audit_user_time ON audit_event (user_id, created_at DESC);
