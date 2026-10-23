/**
 * Checks HaveIBeenPwned API using k-Anonymity (only the first 5 hash characters are sent).
 * Returns breach count (0 if not breached).
 */
export async function checkPwnedPassword(password: string): Promise<number> {
  if (!password) return 0;

  const enc = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-1', enc.encode(password));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();

  const prefix = hashHex.substring(0, 5);
  const suffix = hashHex.substring(5);

  try {
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
    if (!response.ok) return 0;

    const text = await response.text();
    const lines = text.split('\n');

    for (const line of lines) {
      const [returnedSuffix, countStr] = line.trim().split(':');
      if (returnedSuffix === suffix) {
        return parseInt(countStr, 10) || 1;
      }
    }

    return 0;
  } catch {
    // Network offline or blocked
    return 0;
  }
}
