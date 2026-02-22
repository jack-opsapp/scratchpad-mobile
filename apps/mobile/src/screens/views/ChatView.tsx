import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Send, Mic } from 'lucide-react-native';
import { colors as staticColors, theme } from '../../styles';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function ChatView() {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const inputRef = useRef<TextInput>(null);

  const handleSend = () => {
    if (!message.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: message.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setMessage('');

    // TODO: Send to API and get response
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';

    return (
      <View
        style={[
          styles.messageBubble,
          isUser ? styles.userMessage : styles.assistantMessage,
        ]}
      >
        <Text style={styles.messageLabel}>
          {isUser ? 'YOU' : 'SLATE'}
        </Text>
        <Text
          style={[
            styles.messageText,
            isUser ? styles.userMessageText : styles.assistantMessageText,
          ]}
        >
          {item.content}
        </Text>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>What's on your mind?</Text>
      <Text style={styles.emptySubtitle}>
        Type a message to create notes, organize ideas, or ask questions.
      </Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={
          messages.length === 0 ? styles.emptyList : styles.messagesList
        }
        showsVerticalScrollIndicator={false}
        inverted={messages.length > 0}
      />

      {/* Input area */}
      <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.inputWrapper}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor={staticColors.textMuted}
            multiline
            maxLength={2000}
            value={message}
            onChangeText={setMessage}
          />

          <View style={styles.inputActions}>
            <TouchableOpacity
              style={styles.voiceButton}
              activeOpacity={0.7}
            >
              <Mic size={18} color={staticColors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.sendButton,
                message.trim() && styles.sendButtonActive,
              ]}
              onPress={handleSend}
              disabled={!message.trim()}
              activeOpacity={0.7}
            >
              <Send
                size={18}
                color={message.trim() ? colors.primary : staticColors.textMuted}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  emptyList: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontFamily: theme.fonts.medium,
    fontSize: 18,
    color: staticColors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    color: staticColors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  messageBubble: {
    marginBottom: 16,
    maxWidth: '85%',
  },
  userMessage: {
    alignSelf: 'flex-end',
  },
  assistantMessage: {
    alignSelf: 'flex-start',
  },
  messageLabel: {
    fontFamily: theme.fonts.medium,
    fontSize: 10,
    color: staticColors.textMuted,
    letterSpacing: 1,
    marginBottom: 6,
  },
  messageText: {
    fontFamily: theme.fonts.regular,
    fontSize: 15,
    lineHeight: 22,
  },
  userMessageText: {
    color: staticColors.textPrimary,
  },
  assistantMessageText: {
    color: staticColors.textSecondary,
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: 1,
    borderColor: staticColors.border,
    backgroundColor: 'transparent',
  },
  input: {
    flex: 1,
    fontFamily: theme.fonts.regular,
    color: staticColors.textPrimary,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
    maxHeight: 120,
  },
  inputActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
    paddingBottom: 8,
  },
  voiceButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonActive: {
    opacity: 1,
  },
});
