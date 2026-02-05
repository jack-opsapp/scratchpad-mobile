/**
 * Slate Design Tokens - Colors
 * Matches the web app exactly: dark background, gold accents
 * @see /BRAND.md for full brand guidelines
 */
export const colors = {
  // Core backgrounds
  bg: '#000000',
  surface: '#0a0a0a',
  border: '#1a1a1a',

  // Brand accent (gold) - use sparingly
  primary: '#d1b18f',
  primaryDark: '#BC8E5E',
  primaryLight: '#E5D4C1',

  // Text
  textPrimary: '#ffffff',
  textSecondary: '#cccccc',  // Brighter than muted, for agent responses
  textMuted: '#888888',

  // Semantic
  success: '#4CAF50',
  danger: '#ff6b6b',
  error: '#ff4444',

  // Aliases for backward compatibility
  background: '#000000',
  backgroundSecondary: '#0a0a0a',
  backgroundTertiary: '#141414',
} as const;
