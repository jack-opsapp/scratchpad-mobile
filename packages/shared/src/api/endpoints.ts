export const API_ENDPOINTS = {
  agent: '/api/agent',
  parse: '/api/parse',
  embeddings: '/api/embeddings',
  analyzeTags: '/api/analyze-tags',
  sendInvite: '/api/send-invite',
  backfillEmbeddings: '/api/backfill-embeddings',
} as const;

export type ApiEndpoint = typeof API_ENDPOINTS[keyof typeof API_ENDPOINTS];
