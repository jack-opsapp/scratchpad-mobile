/**
 * Slate Design Tokens
 * Mirrors the web app's theme.js for consistent styling
 */
import { colors } from './colors';

export const theme = {
  colors,

  // Font family - Manrope is the display font, fallback to system
  fonts: {
    display: 'Manrope',
    sans: 'System',
  },

  // Font sizes matching web app
  fontSize: {
    xxs: 10,
    xs: 11,
    sm: 12,
    base: 13,
    md: 14,
    lg: 16,
    xl: 20,
    '2xl': 24,
    '3xl': 32,
    '4xl': 56,
  },

  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
  },

  // Spacing system (base unit = 4px)
  spacing: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
    10: 40,
    12: 48,
    16: 64,
    20: 80,
    // Aliases
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },

  // NO border radius - sharp corners throughout
  borderRadius: {
    none: 0,
    sm: 0,
    md: 0,
    lg: 0,
    // Only exception: pills and specific UI elements
    pill: 4,
    sheet: 12, // Bottom sheets only
  },

  // Common component styles
  components: {
    // Cards - sharp corners, subtle border
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 0,
      padding: 16,
    },
    // Buttons - minimal, bordered
    button: {
      primary: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: colors.border,
        paddingVertical: 12,
        paddingHorizontal: 20,
      },
      accent: {
        backgroundColor: colors.primary,
        paddingVertical: 12,
        paddingHorizontal: 20,
      },
    },
    // Inputs - transparent, bordered
    input: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 8,
      paddingHorizontal: 12,
      color: colors.textPrimary,
      fontSize: 13,
    },
    // Tags/Pills
    tag: {
      paddingVertical: 3,
      paddingHorizontal: 8,
      borderWidth: 1,
      borderColor: colors.border,
      fontSize: 11,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.5,
    },
    // Checkbox - square, not rounded
    checkbox: {
      size: 24,
      borderWidth: 2,
      borderColor: colors.border,
      borderRadius: 0,
    },
  },

  // Header styles
  header: {
    height: 56,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  // List item
  listItem: {
    paddingVertical: 16,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
} as const;

export type Theme = typeof theme;
