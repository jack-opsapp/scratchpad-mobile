import React, { createContext, useContext, ReactNode } from 'react';
import { useSettingsStore } from '../stores/settingsStore';

// Accent color definitions — must match web themes.js exactly
const ACCENT_COLORS = {
  beige:      { primary: '#d1b18f', dark: '#BC8E5E', light: '#E5D4C1' },
  sand:       { primary: '#c2b280', dark: '#a39260', light: '#d6cca0' },
  gold:       { primary: '#c9a227', dark: '#a68521', light: '#ddc36a' },
  amber:      { primary: '#d4a574', dark: '#b8895a', light: '#e6c9a8' },
  rust:       { primary: '#c17f59', dark: '#a36845', light: '#d9a889' },
  terracotta: { primary: '#c4786e', dark: '#a65d54', light: '#d9a099' },
  coral:      { primary: '#d4897a', dark: '#b86d5e', light: '#e6b3a8' },
  dustyRose:  { primary: '#c4a4a4', dark: '#a88585', light: '#d9c4c4' },
  mauve:      { primary: '#b09ab0', dark: '#917a91', light: '#c9b9c9' },
  lavender:   { primary: '#9a8fb8', dark: '#7a6f98', light: '#b8afd0' },
  slate:      { primary: '#708090', dark: '#556270', light: '#94a3b3' },
  steel:      { primary: '#7895a8', dark: '#5a7488', light: '#9bb3c4' },
  sage:       { primary: '#9caf88', dark: '#7a8f6a', light: '#b8c9a8' },
  olive:      { primary: '#8a9a5b', dark: '#6b7a45', light: '#a8b87a' },
} as const;

// Base colors — must match colors.ts and web design spec exactly
const BASE_COLORS = {
  bg: '#000000',
  surface: '#0d0d0d',
  border: 'rgba(255, 255, 255, 0.1)',
  textPrimary: '#e8e8e8',
  textSecondary: '#a0a0a0',
  textMuted: '#525252',
  success: '#2d6b3a',
  danger: '#b83c2a',
  error: '#b83c2a',
  background: '#000000',
  backgroundSecondary: '#0d0d0d',
  backgroundTertiary: '#1a1a1a',
} as const;

export type ThemeColors = typeof BASE_COLORS & {
  primary: string;
  primaryDark: string;
  primaryLight: string;
};

const ThemeContext = createContext<ThemeColors | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettingsStore();

  const accentColors = ACCENT_COLORS[settings.accent_color] || ACCENT_COLORS.beige;

  const colors: ThemeColors = {
    ...BASE_COLORS,
    primary: accentColors.primary,
    primaryDark: accentColors.dark,
    primaryLight: accentColors.light,
  };

  return (
    <ThemeContext.Provider value={colors}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
