/** @type {import('tailwindcss').Config['theme']['extend']} */
export const m3ThemeExtend = {
  colors: {
    primary: {
      DEFAULT: 'var(--primary)',
      container: 'var(--primary-container)',
      foreground: 'var(--on-primary)',
      'container-foreground': 'var(--on-primary-container)',
    },
    secondary: {
      DEFAULT: 'var(--secondary)',
      container: 'var(--secondary-container)',
      foreground: 'var(--on-secondary)',
      'container-foreground': 'var(--on-secondary-container)',
    },
    surface: {
      DEFAULT: 'var(--surface)',
      'container-lowest': 'var(--surface-container-lowest)',
      'container-low': 'var(--surface-container-low)',
      container: 'var(--surface-container)',
      'container-high': 'var(--surface-container-high)',
      'container-highest': 'var(--surface-container-highest)',
      foreground: 'var(--on-surface)',
      variant: 'var(--on-surface-variant)',
    },
    outline: {
      DEFAULT: 'var(--outline)',
      variant: 'var(--outline-variant)',
    },
    error: {
      DEFAULT: 'var(--error)',
      container: 'var(--error-container)',
      foreground: 'var(--on-error)',
      'container-foreground': 'var(--on-error-container)',
    },
    warning: {
      DEFAULT: 'var(--warning)',
      container: 'var(--warning-container)',
    },
    success: {
      DEFAULT: 'var(--success)',
      container: 'var(--success-container)',
    },
  },
  borderRadius: {
    sheet: 'var(--radius-sheet)',
    card: 'var(--radius-card)',
    list: 'var(--radius-list)',
    input: 'var(--radius-input)',
    chip: 'var(--radius-chip)',
    pill: 'var(--radius-full)',
  },
  fontFamily: {
    headline: ['var(--font-headline)'],
    body: ['var(--font-body)'],
    mono: ['var(--font-mono)'],
  },
};
