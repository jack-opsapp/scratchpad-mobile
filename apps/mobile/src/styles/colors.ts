/**
 * Slate Design Tokens - Colors
 * Matches the web app exactly: dark background, gold accents
 * @see /BRAND.md for full brand guidelines
 */
export const colors = {
  // Core backgrounds
  bg: '#000000',
  surface: '#0d0d0d',
  surfaceRaised: '#1a1a1a',
  border: 'rgba(255, 255, 255, 0.1)',

  // Brand accent (beige) - use sparingly
  primary: '#948b72',
  primaryDark: '#766f5b',
  primaryLight: '#b5ae9a',

  // Text
  textPrimary: '#e8e8e8',
  textSecondary: '#a0a0a0',
  textMuted: '#525252',

  // Semantic
  success: '#2d6b3a',
  danger: '#b83c2a',
  warning: '#7a5c1a',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.72)',

  // Aliases for backward compatibility
  background: '#000000',
  backgroundSecondary: '#0d0d0d',
  backgroundTertiary: '#1a1a1a',
  error: '#b83c2a',
} as const;
