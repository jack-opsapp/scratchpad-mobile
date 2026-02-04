/**
 * Shared configuration values used across web and mobile.
 */

export const EMBEDDING_DIMENSIONS = 1536;
export const EMBEDDING_MODEL = 'text-embedding-3-small';

export const CONVERSATION_HISTORY_LIMIT = 10;
export const MESSAGE_COMPACT_THRESHOLD = 100;
export const MESSAGES_TO_KEEP_ON_COMPACT = 20;

export const DEFAULT_NOTE_LIMIT = 50;
export const MAX_NOTES_LIMIT = 500;

export const DATE_FORMAT = 'MMM D'; // "Jan 15"

export const PERMISSION_ROLES = ['owner', 'team-admin', 'team', 'team-limited'] as const;

export const VIEW_MODES = ['list', 'boxes', 'calendar'] as const;

export const GROUP_BY_OPTIONS = [
  'section',
  'page',
  'tag',
  'month',
  'week',
  'day',
  'completed',
] as const;
