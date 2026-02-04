import type {
  AgentRequest,
  AgentResponse,
  ParseRequest,
  ParseResponse,
  AnalyzeTagsRequest,
  AnalyzeTagsResponse,
  SendInviteRequest,
  SendInviteResponse,
  SearchResponse,
  EmbeddingResult,
  ContextResponse,
} from '@slate/shared';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiClientConfig {
  baseUrl: string;
  getToken?: () => Promise<string | null>;
  timeout?: number;
  onError?: (error: ApiError) => void;
}

export class ApiClient {
  private baseUrl: string;
  private getToken: () => Promise<string | null>;
  private timeout: number;
  private onError?: (error: ApiError) => void;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.getToken = config.getToken || (() => Promise.resolve(null));
    this.timeout = config.timeout || 30000;
    this.onError = config.onError;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getToken();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({})) as Record<string, unknown>;
        const error = new ApiError(
          response.status,
          (errorBody.message as string) || (errorBody.error as string) || `Request failed with status ${response.status}`,
          errorBody
        );
        this.onError?.(error);
        throw error;
      }

      return response.json() as Promise<T>;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ApiError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError = new ApiError(408, 'Request timeout');
        this.onError?.(timeoutError);
        throw timeoutError;
      }

      const networkError = new ApiError(0, 'Network error', error);
      this.onError?.(networkError);
      throw networkError;
    }
  }

  /**
   * Agent API - Main intelligent command processing
   */
  agent = {
    call: (request: AgentRequest): Promise<AgentResponse> =>
      this.request('/api/agent', {
        method: 'POST',
        body: JSON.stringify(request),
      }),
  };

  /**
   * Parse API - Natural language parsing with RAG
   */
  parse = {
    analyze: (request: ParseRequest): Promise<ParseResponse> =>
      this.request('/api/parse', {
        method: 'POST',
        body: JSON.stringify(request),
      }),
  };

  /**
   * Embeddings API - Vector operations
   */
  embeddings = {
    generate: (text: string): Promise<EmbeddingResult> =>
      this.request('/api/embeddings', {
        method: 'POST',
        body: JSON.stringify({ action: 'generate', text }),
      }),

    embedNote: (noteId: string, content: string): Promise<{ success: boolean }> =>
      this.request('/api/embeddings', {
        method: 'POST',
        body: JSON.stringify({ action: 'embed_note', noteId, content }),
      }),

    searchNotes: (
      query: string,
      userId: string,
      options?: { threshold?: number; limit?: number }
    ): Promise<SearchResponse> =>
      this.request('/api/embeddings', {
        method: 'POST',
        body: JSON.stringify({
          action: 'search_notes',
          query,
          userId,
          threshold: options?.threshold ?? 0.5,
          limit: options?.limit ?? 10,
        }),
      }),

    searchChat: (
      query: string,
      userId: string,
      options?: { threshold?: number; limit?: number }
    ): Promise<SearchResponse> =>
      this.request('/api/embeddings', {
        method: 'POST',
        body: JSON.stringify({
          action: 'search_chat',
          query,
          userId,
          threshold: options?.threshold ?? 0.5,
          limit: options?.limit ?? 10,
        }),
      }),

    storeChat: (
      userId: string,
      role: 'user' | 'assistant',
      content: string,
      metadata?: Record<string, unknown>
    ): Promise<{ success: boolean }> =>
      this.request('/api/embeddings', {
        method: 'POST',
        body: JSON.stringify({
          action: 'store_chat',
          userId,
          role,
          content,
          metadata,
        }),
      }),

    getContext: (userId: string): Promise<ContextResponse> =>
      this.request('/api/embeddings', {
        method: 'POST',
        body: JSON.stringify({ action: 'get_context', userId }),
      }),
  };

  /**
   * Analyze Tags API - AI-powered tag suggestions
   */
  tags = {
    analyze: (request: AnalyzeTagsRequest): Promise<AnalyzeTagsResponse> =>
      this.request('/api/analyze-tags', {
        method: 'POST',
        body: JSON.stringify(request),
      }),
  };

  /**
   * Invitations API - Email invitations
   */
  invitations = {
    send: (request: SendInviteRequest): Promise<SendInviteResponse> =>
      this.request('/api/send-invite', {
        method: 'POST',
        body: JSON.stringify(request),
      }),
  };
}
