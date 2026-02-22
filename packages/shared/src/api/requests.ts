import type { NoteFilter, PageWithSections } from '../types';

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AgentContext {
  currentPage?: string;
  currentSection?: string;
}

export interface AgentRequest {
  message: string;
  userId: string;
  conversationHistory?: ConversationMessage[];
  confirmed?: string;
  context?: AgentContext;
  customApiKey?: string;
  customModel?: string;
}

export interface ParseContext {
  userId?: string;
  pages?: PageWithSections[];
  tags?: string[];
  currentPage?: string;
  currentSection?: string;
  currentFilters?: {
    tags?: string[];
    search?: string;
    completed?: boolean;
  };
  viewMode?: 'list' | 'boxes' | 'calendar';
}

export interface PlanGroup {
  id: string;
  description: string;
  actionCount: number;
  actions: PlanAction[];
}

export interface PlanAction {
  type: 'create_page' | 'create_section' | 'create_note' | 'delete_page' | 'delete_section' | 'delete_notes';
  name?: string;
  pageName?: string;
  sectionName?: string;
  content?: string;
  tags?: string[];
  date?: string;
  filter?: NoteFilter;
  description?: string;
}

export interface PlanState {
  mode: 'planning' | 'confirming';
  plan?: {
    groups: PlanGroup[];
    totalGroups: number;
    totalActions: number;
  };
  currentGroupIndex?: number;
  context?: Record<string, unknown>;
}

export interface ParseRequest {
  input: string;
  context?: ParseContext;
  planState?: PlanState;
}

export type EmbeddingsAction =
  | 'generate'
  | 'embed_note'
  | 'search_notes'
  | 'search_chat'
  | 'store_chat'
  | 'get_context';

export interface EmbeddingsRequest {
  action: EmbeddingsAction;
  text?: string;
  noteId?: string;
  content?: string;
  query?: string;
  userId?: string;
  threshold?: number;
  limit?: number;
  role?: 'user' | 'assistant';
  metadata?: Record<string, unknown>;
}

export interface AnalyzeTagsRequest {
  userId: string;
  filter?: {
    untagged?: boolean;
    sectionId?: string;
  };
}

export interface SendInviteRequest {
  toEmail: string;
  inviterName: string;
  pageName: string;
}
