-- =============================================================================
-- Migration 009: Add Custom OpenAI Model Column
-- =============================================================================
-- Adds custom_openai_model field to allow users to specify their preferred
-- OpenAI model (e.g., gpt-4.1-mini, gpt-4o, gpt-4-turbo, etc.)
-- =============================================================================

-- Add custom_openai_model column
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS custom_openai_model TEXT;

-- Set default value for existing rows
UPDATE user_settings
SET custom_openai_model = 'gpt-4.1-mini'
WHERE custom_openai_model IS NULL;
