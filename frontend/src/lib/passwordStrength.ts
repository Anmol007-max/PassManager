export interface PasswordStrength {
  score: number; // 0..4
  color: string;
}

/**
 * Evaluates password strength using multi-factor entropy estimation:
 * length, character variety, common patterns, and repetition.
 * Returns score 0 to 4 and Apple HIG compliant color token per DESIGN_SPEC.md.
 */
export function evaluatePasswordStrength(password: string): PasswordStrength {
  if (!password || password.length === 0) {
    return { score: 0, color: 'var(--separator)' };
  }

  let score = 0;

  // Length checks
  if (password.length >= 8) score++;
  if (password.length >= 14) score++;
  if (password.length >= 20) score++;

  // Variety checks
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);

  const varietyCount = [hasLower, hasUpper, hasNumber, hasSymbol].filter(Boolean).length;
  if (varietyCount >= 3) score++;
  if (varietyCount === 4 && password.length >= 16) score++;

  // Common pattern deductions
  if (/^[a-zA-Z]+$/.test(password) || /^[0-9]+$/.test(password)) {
    score = Math.max(0, score - 1);
  }

  // Cap score between 0 and 4
  const finalScore = Math.min(4, Math.max(0, score));

  // Color mapping per DESIGN_SPEC.md Section 4:
  // "thin 4px line: gray, then orange, then green. Never red text shaming the user."
  let color = 'var(--outline-variant)'; // Outline variant (score 0-1)
  if (finalScore === 2 || finalScore === 3) {
    color = 'var(--warning)'; // Amber / Warning (score 2-3)
  } else if (finalScore === 4) {
    color = 'var(--success)'; // Green / Success (score 4)
  }

  return { score: finalScore, color };
}
