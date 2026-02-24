/**
 * Slate Design Tokens
 * Mirrors the web app's theme.js for consistent styling
 */
import { colors } from './colors';

export const theme = {
  colors,

  // Font family - Manrope is the display font
  fonts: {
    regular: 'Manrope-Regular',
    medium: 'Manrope-Medium',
    semibold: 'Manrope-SemiBold',
  },

  // Font sizes matching web design system
  fontSize: {
    xs: 11,
    sm: 13,
    base: 14,
    md: 16,
    lg: 18,
    xl: 24,
    '2xl': 32,
    '3xl': 40,
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

  // Sharp corners throughout — 2px max
  borderRadius: {
    none: 0,
    sm: 0,
    md: 0,
    lg: 0,
    // Only exception: popovers/floating elements (4px max)
    pill: 2,
    popover: 4,
    sheet: 4,
  },

  // Common component styles
  components: {
    // Cards - sharp corners, subtle border
    card: {
      backgroundColor: 'transparent',
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
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: colors.primary,
        paddingVertical: 12,
        paddingHorizontal: 20,
      },
    },
    // Inputs - transparent, no visible border by default
    input: {
      backgroundColor: 'transparent',
      borderWidth: 0,
      borderColor: colors.border,
      paddingVertical: 8,
      paddingHorizontal: 12,
      color: colors.textPrimary,
      fontSize: 14,
    },
    // Tags/Pills
    tag: {
      paddingVertical: 2,
      paddingHorizontal: 8,
      borderWidth: 1,
      borderColor: colors.border,
      fontSize: 11,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.5,
    },
    // Checkbox - square, not rounded
    checkbox: {
      size: 16,
      borderWidth: 1,
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

  // Transitions
  transitions: {
    fast: 150,
    normal: 200,
    slow: 250,
  },
} as const;

export type Theme = typeof theme;
