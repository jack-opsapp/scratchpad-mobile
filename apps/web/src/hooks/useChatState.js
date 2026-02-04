import { useState, useCallback, useRef } from 'react';
import { MESSAGE_COMPACT_THRESHOLD, MESSAGES_TO_KEEP_ON_COMPACT, CONVERSATION_HISTORY_LIMIT } from '@slate/shared';

export default function useChatState() {
  const [messages, setMessages] = useState([]);
  const [processing, setProcessing] = useState(false);
  const contextWindowRef = useRef(0);

  // Add user message
  const addUserMessage = useCallback((content) => {
    setMessages(prev => [
      ...prev,
      {
        role: 'user',
        content,
        timestamp: Date.now()
      }
    ]);
  }, []);

  // Add agent message
  const addAgentMessage = useCallback((content, type = 'text_response', metadata = {}) => {
    setMessages(prev => [
      ...prev,
      {
        role: 'agent',
        content,
        type,
        timestamp: Date.now(),
        responded: false,
        ...metadata
      }
    ]);
  }, []);

  // Add system message
  const addSystemMessage = useCallback((content) => {
    setMessages(prev => [
      ...prev,
      {
        role: 'system',
        content,
        timestamp: Date.now()
      }
    ]);
  }, []);

  // Mark message as responded (for confirmations/clarifications)
  const markMessageResponded = useCallback((messageIndex) => {
    setMessages(prev => prev.map((msg, i) =>
      i === messageIndex ? { ...msg, responded: true } : msg
    ));
  }, []);

  // Compact history when context limit reached
  const compactHistory = useCallback(() => {
    setMessages(prev => {
      if (prev.length < MESSAGE_COMPACT_THRESHOLD) return prev;

      // Keep last N messages, summarize rest
      const keep = prev.slice(-MESSAGES_TO_KEEP_ON_COMPACT);
      const toSummarize = prev.slice(0, -MESSAGES_TO_KEEP_ON_COMPACT);

      // Create summary message
      const summary = `[Previous ${toSummarize.length} messages summarized]`;

      contextWindowRef.current++;

      return [
        { role: 'system', content: summary, timestamp: Date.now() },
        ...keep
      ];
    });
  }, []);

  // Check if should compact
  const checkCompact = useCallback(() => {
    if (messages.length >= MESSAGE_COMPACT_THRESHOLD) {
      compactHistory();
    }
  }, [messages.length, compactHistory]);

  // Clear all history
  const clearHistory = useCallback(() => {
    setMessages([]);
    contextWindowRef.current = 0;
  }, []);

  // Get recent context for agent
  const getRecentContext = useCallback((count = CONVERSATION_HISTORY_LIMIT) => {
    return messages.slice(-count).map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }, [messages]);

  return {
    messages,
    processing,
    setProcessing,
    addUserMessage,
    addAgentMessage,
    addSystemMessage,
    markMessageResponded,
    checkCompact,
    clearHistory,
    getRecentContext,
    contextWindowCount: contextWindowRef.current
  };
}
