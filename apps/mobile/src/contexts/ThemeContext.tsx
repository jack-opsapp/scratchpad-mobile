import React, { createContext, useContext, ReactNode } from 'react';
import { useSettingsStore } from '../stores/settingsStore';

// Accent color definitions (from SettingsDrawer)
const ACCENT_COLORS = {
  beige:      { primary: '#d1b18f', dark: '#BC8E5E', light: '#E5D4C1' },
  sand:       { primary: '#c2b280', dark: '#A89563', light: '#D9CDAD' },
  gold:       { primary: '#c9a227', dark: '#A88520', light: '#E0C55F' },
  amber:      { primary: '#d4a574', dark: '#B88A5A', light: '#E8C9A1' },
  rust:       { primary: '#c17f59', dark: '#A06847', light: '#D9A588' },
  terracotta: { primary: '#c4786e', dark: '#A46158', light: '#DBA297' },
  coral:      { primary: '#d4897a', dark: '#B47261', light: '#E8B3A7' },
  dustyRose:  { primary: '#c4a4a4', dark: '#A88A8A', light: '#DFCCCC' },
  mauve:      { primary: '#b09ab0', dark: '#938193', light: '#D1C3D1' },
  lavender:   { primary: '#9a8fb8', dark: '#7E759B', light: '#C1B8DC' },
  slate:      { primary: '#708090', dark: '#5A6777', light: '#A3B0BE' },
  steel:      { primary: '#7895a8', dark: '#5F7A8A', light: '#AABFCE' },
  sage:       { primary: '#9caf88', dark: '#7E926E', light: '#C5D4B4' },
  olive:      { primary: '#8a9a5b', dark: '#6F7D4A', light: '#B5C591' },
} as const;

// Base colors (always the same)
const BASE_COLORS = {
  bg: '#000000',
  surface: '#0a0a0a',
  border: '#1a1a1a',
  textPrimary: '#ffffff',
  textSecondary: '#cccccc',
  textMuted: '#888888',
  success: '#4CAF50',
  danger: '#ff6b6b',
  error: '#ff4444',
  background: '#000000',
  backgroundSecondary: '#0a0a0a',
  backgroundTertiary: '#141414',
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
