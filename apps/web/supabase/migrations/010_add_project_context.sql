-- =============================================================================
-- Migration 010: Add project_context to user_settings
-- =============================================================================
-- Allows users to provide project context that the AI agent uses for better
-- note categorization and tagging.
-- =============================================================================

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS project_context TEXT DEFAULT '';
