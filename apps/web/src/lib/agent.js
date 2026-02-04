/**
 * AI Agent Client - Uses @slate/api-client for API calls
 *
 * The agent uses OpenAI function calling to:
 * 1. Query data on-demand (pages, sections, notes)
 * 2. Execute operations (create, update, delete, bulk)
 * 3. Navigate the user to views
 * 4. Ask for clarification when needed
 */

import { ApiClient } from '@slate/api-client';
import { CONVERSATION_HISTORY_LIMIT } from '@slate/shared';

// Create API client instance
const apiClient = new ApiClient({
  baseUrl: import.meta.env.VITE_API_URL || '',
  timeout: 30000,
});

/**
 * Call the AI agent
 * @param {string} message - User message
 * @param {string} userId - User ID for data access
 * @param {Array} conversationHistory - Recent messages for context
 * @param {string} confirmed - If this is a confirmation response, the confirmed value
 * @param {object} context - Current UI context (page, section)
 * @returns {Promise<import('@slate/shared').AgentResponse>} Agent response
 */
export async function callAgent(message, userId, conversationHistory = [], confirmed = null, context = null) {
  try {
    const result = await apiClient.agent.call({
      message,
      userId,
      conversationHistory: conversationHistory.slice(-CONVERSATION_HISTORY_LIMIT),
      ...(confirmed && { confirmed }),
      ...(context && { context }),
    });

    return { ...result, _source: 'api' };

  } catch (error) {
    console.error('Agent call failed:', error);
    return {
      type: 'error',
      message: 'Sorry, I encountered an error. Please try again.',
      _source: 'error',
      _error: error.message
    };
  }
}

export { apiClient };
export default callAgent;
