import { getRandomBytes } from '../crypto/random';

export interface GeneratorOptions {
  length: number;
  includeUppercase: boolean;
  includeLowercase: boolean;
  includeNumbers: boolean;
  includeSymbols: boolean;
}

const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const NUMBERS = '0123456789';
const SYMBOLS = '!@#$%^&*()-_=+[]{}|;:,.<>?';

export function generatePassword(options: GeneratorOptions): string {
  let charPool = '';
  const requiredChars: string[] = [];

  if (options.includeLowercase) {
    charPool += LOWERCASE;
    requiredChars.push(getRandomChar(LOWERCASE));
  }
  if (options.includeUppercase) {
    charPool += UPPERCASE;
    requiredChars.push(getRandomChar(UPPERCASE));
  }
  if (options.includeNumbers) {
    charPool += NUMBERS;
    requiredChars.push(getRandomChar(NUMBERS));
  }
  if (options.includeSymbols) {
    charPool += SYMBOLS;
    requiredChars.push(getRandomChar(SYMBOLS));
  }

  if (charPool === '') {
    charPool = LOWERCASE + NUMBERS;
    requiredChars.push(getRandomChar(LOWERCASE));
  }

  const length = Math.max(options.length, requiredChars.length);
  const remainingCount = length - requiredChars.length;
  const result: string[] = [...requiredChars];

  const randomBytes = getRandomBytes(remainingCount);
  for (let i = 0; i < remainingCount; i++) {
    const idx = randomBytes[i] % charPool.length;
    result.push(charPool[idx]);
  }

  // Fisher-Yates shuffle using cryptographically secure random bytes
  const shuffleBytes = getRandomBytes(result.length);
  for (let i = result.length - 1; i > 0; i--) {
    const j = shuffleBytes[i] % (i + 1);
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }

  return result.join('');
}

function getRandomChar(charset: string): string {
  const bytes = getRandomBytes(1);
  return charset[bytes[0] % charset.length];
}
