/**
 * Slate color palette
 * Matches the web app: dark background, gold accents
 */
export const colors = {
  // Backgrounds
  background: '#000000',
  backgroundSecondary: '#0a0a0a',
  backgroundTertiary: '#141414',

  // Gold accent (primary)
  primary: '#d1b18f',
  primaryMuted: '#a08060',
  primaryBright: '#e8c9a0',

  // Text
  textPrimary: '#ffffff',
  textSecondary: '#a0a0a0',
  textMuted: '#606060',

  // Borders
  border: '#2a2a2a',
  borderLight: '#3a3a3a',

  // Status
  success: '#4ade80',
  error: '#ef4444',
  warning: '#f59e0b',

  // Tags
  tagBackground: '#1a1a1a',
  tagText: '#d1b18f',

  // Completion
  completed: '#4ade80',
  incomplete: '#606060',
} as const;
