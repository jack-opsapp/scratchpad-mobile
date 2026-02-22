-- =============================================================================
-- Migration 008: Update Accent Color Options
-- =============================================================================
-- Expands accent_color constraint to match mobile app color palette
-- =============================================================================

-- Drop existing constraint
ALTER TABLE user_settings
DROP CONSTRAINT IF EXISTS user_settings_accent_color_check;

-- Add new constraint with expanded color palette
ALTER TABLE user_settings
ADD CONSTRAINT user_settings_accent_color_check
CHECK (accent_color IN (
  'beige',
  'sand',
  'gold',
  'amber',
  'rust',
  'terracotta',
  'coral',
  'dustyRose',
  'mauve',
  'lavender',
  'slate',
  'steel',
  'sage',
  'olive',
  'custom'
));
