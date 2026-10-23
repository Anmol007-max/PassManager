import React, { useState, useEffect } from 'react';
import { vaultService } from '../services/vaultService';
import { platformBiometric } from '../platform';
import { useSessionStore } from '../store/session';

interface UnlockScreenProps {
  onUnlockSuccess: () => void;
}

export const UnlockScreen: React.FC<UnlockScreenProps> = ({ onUnlockSuccess }) => {
  const displayName = useSessionStore((state) => state.displayName);
  const setDisplayName = useSessionStore((state) => state.setDisplayName);

  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState(displayName);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    platformBiometric.checkAvailability().then((status) => {
      setBiometricAvailable(status.available);
    });
  }, []);

  const handleBiometricUnlock = async () => {
    setError(null);
    setLoading(true);
    try {
      const success = await vaultService.unlockWithBiometrics();
      if (success) {
        onUnlockSuccess();
      } else {
        setError('Biometric authentication failed. Please enter your master password.');
      }
    } catch (err: any) {
      setError(err.message || 'Biometric unlock failed. Please enter your master password.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }

    if (isRegistering) {
      if (password.length < 12) {
        setError('Master password must be at least 12 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setLoading(true);
    try {
      if (name.trim()) {
        setDisplayName(name.trim());
      }
      if (isRegistering) {
        await vaultService.register(email.trim(), password);
        await vaultService.login(email.trim(), password);
        onUnlockSuccess();
      } else {
        await vaultService.login(email.trim(), password);
        onUnlockSuccess();
      }
    } catch (err: any) {
      if (isRegistering) {
        setError(err.message || 'Could not create vault. Please try again.');
      } else {
        setError("That password didn't work. Try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '85vh',
        width: '100%',
        maxWidth: '400px',
        margin: '0 auto',
        padding: '32px 16px',
      }}
    >
      {/* 96px Tonal Circle with M3 Icon */}
      <div
        style={{
          width: '96px',
          height: '96px',
          borderRadius: 'var(--radius-avatar)',
          backgroundColor: 'var(--primary-container)',
          color: 'var(--on-primary-container)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '20px',
          boxShadow: 'var(--elevation-1)',
        }}
      >
        <span className="material-symbols-rounded" style={{ fontSize: '48px' }}>
          {isRegistering ? 'enhanced_encryption' : 'lock'}
        </span>
      </div>

      <h1 className="title-large" style={{ marginBottom: '8px', textAlign: 'center' }}>
        {isRegistering ? 'Create Your Vault' : (displayName ? `Welcome, ${displayName.split(' ')[0]}` : 'Welcome Back')}
      </h1>
      <p
        className="text-caption"
        style={{ marginBottom: '32px', textAlign: 'center', maxWidth: '320px', lineHeight: 1.4 }}
      >
        {isRegistering
          ? 'Zero-knowledge client-side encryption. Only you hold your master key.'
          : 'Unlock your secure password vault'}
      </p>

      {error && (
        <div
          style={{
            backgroundColor: 'var(--error-container)',
            color: 'var(--on-error-container)',
            borderRadius: 'var(--radius-chip)',
            padding: '12px 16px',
            fontSize: '14px',
            textAlign: 'center',
            marginBottom: '20px',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>error</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ width: '100%' }}>
        {isRegistering && (
          <div className="field-group">
            <input
              type="text"
              className="input-field"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </div>
        )}

        <div className="field-group">
          <input
            type="email"
            className="input-field"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            autoFocus
          />
        </div>

        <div className="field-group" style={{ position: 'relative' }}>
          <input
            type={showPassword ? 'text' : 'password'}
            className="input-field"
            placeholder="Master password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={isRegistering ? 'new-password' : 'current-password'}
            required
            style={{ paddingRight: '48px' }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--on-surface-variant)',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
            }}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>
              {showPassword ? 'visibility_off' : 'visibility'}
            </span>
          </button>
        </div>

        {isRegistering && (
          <>
            <div className="field-group">
              <input
                type={showPassword ? 'text' : 'password'}
                className="input-field"
                placeholder="Confirm master password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            <p
              className="text-caption"
              style={{
                marginBottom: '16px',
                lineHeight: 1.4,
                color: 'var(--on-surface-variant)',
                backgroundColor: 'var(--surface-container-high)',
                padding: '10px 14px',
                borderRadius: 'var(--radius-input)',
              }}
            >
              Note: If you forget your master password, your stored passwords cannot be recovered.
            </p>
          </>
        )}

        <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '8px' }}>
          <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>
            {isRegistering ? 'person_add' : 'key'}
          </span>
          <span>{loading ? 'Please wait...' : isRegistering ? 'Create Vault' : 'Unlock'}</span>
        </button>

        {biometricAvailable && !isRegistering && (
          <button
            type="button"
            className="btn-tonal"
            disabled={loading}
            onClick={handleBiometricUnlock}
            style={{
              width: '100%',
              marginTop: '12px',
              fontSize: '15px',
            }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '22px', color: 'var(--primary)' }}>
              fingerprint
            </span>
            <span>Unlock with Biometrics</span>
          </button>
        )}

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <button
            type="button"
            className="btn-text"
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError(null);
            }}
          >
            {isRegistering ? 'Already have a vault? Unlock' : "Don't have a vault? Create one"}
          </button>
        </div>
      </form>
    </div>
  );
};
