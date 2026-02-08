import { useState, useCallback, useRef } from 'react';
import type { ConversationMessage, PlanGroup } from '@slate/shared';

const COMPACT_THRESHOLD = 100;
const COMPACT_KEEP = 20;
const HISTORY_LIMIT = 10;

export type MessageType =
  | 'text_response'
  | 'clarification'
  | 'bulk_confirmation'
  | 'execution_result'
  | 'error'
  | 'plan_proposal';

export type PlanGroupStatus = 'pending' | 'approved' | 'skipped';
export type PlanExecutionState = 'reviewing' | 'executing' | 'complete';

export interface ChatMessage {
  role: 'user' | 'agent';
  content: string;
  type?: MessageType;
  timestamp: number;
  responded?: boolean;
  options?: Array<{ label: string; value: string }>;
  confirmValue?: string;
  planData?: {
    summary?: string;
    groups: PlanGroup[];
    totalGroups: number;
    totalActions: number;
  };
  planGroupStatuses?: PlanGroupStatus[];
  planExecutionState?: PlanExecutionState;
}

interface QueuedMessage {
  message: string;
  confirmedValue?: string | null;
}

export function useChatState() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [processing, setProcessing] = useState(false);
  const [messageQueue, setMessageQueue] = useState<QueuedMessage[]>([]);
  const processingRef = useRef(false);

  const addUserMessage = useCallback((content: string) => {
    setMessages(prev => [
      ...prev,
      { role: 'user', content, timestamp: Date.now() },
    ]);
  }, []);

  const addAgentMessage = useCallback(
    (
      content: string,
      type: MessageType = 'text_response',
      metadata?: Partial<ChatMessage>,
    ) => {
      setMessages(prev => [
        ...prev,
        {
          role: 'agent',
          content,
          type,
          timestamp: Date.now(),
          responded: false,
          ...metadata,
        },
      ]);
    },
    [],
  );

  const markMessageResponded = useCallback((index: number) => {
    setMessages(prev =>
      prev.map((msg, i) => (i === index ? { ...msg, responded: true } : msg)),
    );
  }, []);

  const updateMessage = useCallback((index: number, updates: Partial<ChatMessage>) => {
    setMessages(prev =>
      prev.map((msg, i) => (i === index ? { ...msg, ...updates } : msg)),
    );
  }, []);

  const getConversationHistory = useCallback((): ConversationMessage[] => {
    return messages.slice(-HISTORY_LIMIT).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    }));
  }, [messages]);

  const compactHistory = useCallback(() => {
    if (messages.length > COMPACT_THRESHOLD) {
      setMessages(prev => prev.slice(-COMPACT_KEEP));
    }
  }, [messages.length]);

  const setIsProcessing = useCallback((value: boolean) => {
    processingRef.current = value;
    setProcessing(value);
  }, []);

  const isProcessing = useCallback(() => {
    return processingRef.current;
  }, []);

  const addToQueue = useCallback(
    (message: string, confirmedValue?: string | null) => {
      setMessageQueue(prev => [...prev, { message, confirmedValue }]);
    },
    [],
  );

  const getNextFromQueue = useCallback((): QueuedMessage | null => {
    let next: QueuedMessage | null = null;
    setMessageQueue(prev => {
      if (prev.length === 0) return prev;
      next = prev[0];
      return prev.slice(1);
    });
    return next;
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setMessageQueue([]);
  }, []);

  return {
    messages,
    processing,
    queueLength: messageQueue.length,
    addUserMessage,
    addAgentMessage,
    markMessageResponded,
    updateMessage,
    getConversationHistory,
    compactHistory,
    setProcessing: setIsProcessing,
    isProcessing,
    addToQueue,
    getNextFromQueue,
    clearMessages,
  };
}
