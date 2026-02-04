import type { PlanGroup } from './requests';

// Agent API Responses
export type AgentResponseType = 'response' | 'clarification' | 'confirmation' | 'error';

export interface ClarificationOption {
  label: string;
  value: string;
}

export interface FrontendAction {
  function: 'navigate' | 'apply_filter' | 'clear_filters' | 'create_custom_view';
  page_name?: string;
  section_name?: string;
  tags?: string[];
  completed?: boolean;
  search?: string;
  title?: string;
  view_type?: 'list' | 'boxes' | 'calendar';
  filter?: Record<string, unknown>;
  group_by?: 'section' | 'page' | 'tag' | 'month' | 'week' | 'day' | 'completed';
}

export interface AgentResponse {
  type: AgentResponseType;
  message?: string;
  question?: string;
  confirmValue?: string;
  options?: ClarificationOption[];
  actions?: FrontendAction[];
  messageCount?: number;
  iterations?: number;
  details?: string; // For error type
}

// Parse API Responses
export type ParseResponseType =
  | 'single_action'
  | 'text_response'
  | 'view_change'
  | 'clarification'
  | 'bulk_confirmation'
  | 'plan_proposal'
  | 'tag_analysis';

export interface ViewAction {
  type: 'navigate' | 'apply_filter' | 'switch_view' | 'clear_filter';
  page?: string;
  section?: string;
  filters?: {
    tags?: string[];
    incomplete?: boolean;
    search?: string;
  };
  mode?: 'list' | 'boxes' | 'calendar';
}

export interface BulkOperation {
  type: 'mark_complete' | 'mark_incomplete' | 'delete' | 'add_tag' | 'remove_tag' | 'move_to_section';
  target: {
    filters?: {
      tags?: string[];
      completed?: boolean;
      sectionId?: string;
      untagged?: boolean;
    };
  };
}

export interface ParsedNote {
  page?: string;
  section?: string;
  content: string;
  date?: string;
  tags?: string[];
  action: 'add';
  newPage?: boolean;
  newSection?: boolean;
}

export interface ParseResponse {
  type: ParseResponseType;
  message?: string;
  // For single_action
  parsed?: ParsedNote;
  response?: { message: string; note?: string };
  // For view_change
  actions?: ViewAction[];
  // For clarification
  options?: ClarificationOption[];
  // For bulk_confirmation
  operation?: BulkOperation;
  affectedCount?: number;
  preview?: string[];
  // For plan_proposal
  plan?: {
    totalGroups: number;
    groups: PlanGroup[];
    totalActions: number;
  };
  // For tag_analysis
  filter?: { untagged?: boolean };
  data?: Record<string, unknown>;
}

// Embeddings API Responses
export interface EmbeddingResult {
  embedding: number[];
}

export interface SearchResult {
  id: string;
  content: string;
  similarity: number;
  tags?: string[];
  section_name?: string;
  page_name?: string;
}

export interface SearchResponse {
  results: SearchResult[];
}

export interface ContextResponse {
  context: {
    pages: Array<{
      name: string;
      sections: Array<{ name: string; noteCount: number }>;
      noteCount: number;
    }>;
    allTags: string[];
    stats: {
      totalNotes: number;
      completedNotes: number;
    };
  };
}

// Analyze Tags Response
export interface TagSuggestion {
  noteId: string;
  tags: string[];
  reason: string;
}

export interface AnalyzeTagsResponse {
  success: boolean;
  totalNotes: number;
  analyzedNotes: number;
  existingTags: string[];
  suggestions: TagSuggestion[];
  newTagsNeeded: string[];
  summary: string;
}

// Send Invite Response
export interface SendInviteResponse {
  success: boolean;
  skipped: boolean;
}
