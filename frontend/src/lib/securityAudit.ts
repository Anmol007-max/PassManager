import { DecryptedEntry } from '../store/session';
import { evaluatePasswordStrength } from './passwordStrength';

export interface SecurityAuditReport {
  total: number;
  weakCount: number;
  reusedCount: number;
  favoritesCount: number;
  totpCount: number;
}

export function auditVault(entries: DecryptedEntry[]): SecurityAuditReport {
  let weakCount = 0;
  let favoritesCount = 0;
  let totpCount = 0;

  // Track password frequency for reuse
  const passwordCounts = new Map<string, number>();

  for (const entry of entries) {
    if (entry.data.favorite) {
      favoritesCount++;
    }
    if (entry.data.totpSecret) {
      totpCount++;
    }

    const pw = entry.data.password;
    if (pw) {
      const strength = evaluatePasswordStrength(pw);
      if (strength.score < 3) {
        weakCount++;
      }
      passwordCounts.set(pw, (passwordCounts.get(pw) || 0) + 1);
    }
  }

  let reusedCount = 0;
  for (const [_, count] of passwordCounts) {
    if (count > 1) {
      reusedCount += count;
    }
  }

  return {
    total: entries.length,
    weakCount,
    reusedCount,
    favoritesCount,
    totpCount,
  };
}
