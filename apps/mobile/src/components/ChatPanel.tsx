import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  FlatList,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  InputAccessoryView,
  Keyboard,
  LayoutChangeEvent,
  Share,
  Vibration,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  runOnJS,
  Easing,
  interpolate,
  useFrameCallback,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { BlurView } from '@react-native-community/blur';
import Voice, {
  SpeechResultsEvent,
  SpeechErrorEvent,
  SpeechVolumeChangeEvent,
} from '@react-native-voice/voice';
import { Send, Mic, Square, ChevronDown, ChevronRight, Check, X, FileText, FolderPlus, StickyNote, Trash2 } from 'lucide-react-native';
import { colors as staticColors, theme } from '../styles';
import { useTheme } from '../contexts/ThemeContext';
import { useSettingsStore } from '../stores/settingsStore';
import type { ChatMessage, PlanGroupStatus } from '../hooks/useChatState';
import type { PlanAction } from '@slate/shared';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const INPUT_ACCESSORY_ID = 'chatInputAccessory';

// Compute color from mode (accent/grayscale) + brightness (0-100) + accent hex
function computeChatColor(mode: 'accent' | 'grayscale', brightness: number, accentHex: string): string {
  const b = Math.max(0, Math.min(100, brightness));
  if (mode === 'grayscale') {
    const v = Math.round((b / 100) * 255);
    return `rgb(${v}, ${v}, ${v})`;
  }
  // Accent mode: scale accent color by brightness
  const r = parseInt(accentHex.slice(1, 3), 16);
  const g = parseInt(accentHex.slice(3, 5), 16);
  const bl = parseInt(accentHex.slice(5, 7), 16);
  const f = b / 100;
  return `rgb(${Math.round(r * f)}, ${Math.round(g * f)}, ${Math.round(bl * f)})`;
}

// Waveform constants
const WAVEFORM_BAR_COUNT = 24;
const WAVEFORM_BAR_WIDTH = 3;
const WAVEFORM_BAR_GAP = 2;
const WAVEFORM_HEIGHT = 32;
const EXPANSION_DURATION = 350;

// WaveformBar: memoized individual bar driven by real audio volume + time for variation
const WaveformBar = memo(({
  index,
  waveformTime,
  volumeLevel,
}: {
  index: number;
  waveformTime: Animated.SharedValue<number>;
  volumeLevel: Animated.SharedValue<number>;
}) => {
  const animStyle = useAnimatedStyle(() => {
    const t = waveformTime.value;
    const vol = volumeLevel.value; // 0-10 from iOS, 0-10 from Android

    // Per-bar phase offset so bars don't move in unison
    const phase = index * 0.55;
    const variation = Math.sin(t * 4.0 + phase) * 0.3 + 0.7; // 0.4–1.0 multiplier

    // Normalize volume: 0-10 → 0-1, then scale to max bar height
    const normalizedVol = Math.min(vol / 7, 1.0);
    const height = Math.max(4, normalizedVol * variation * WAVEFORM_HEIGHT);

    return {
      height,
      width: WAVEFORM_BAR_WIDTH,
      backgroundColor: staticColors.primary,
      borderRadius: WAVEFORM_BAR_WIDTH / 2,
      marginHorizontal: WAVEFORM_BAR_GAP / 2,
    };
  });

  return <Animated.View style={animStyle} />;
});

const HEIGHTS = {
  inputOnly: 76,
  collapsed: 110,
  small: 250,
  medium: 400,
  large: Math.floor(SCREEN_HEIGHT * 0.8),
};

// --- Plan Card helpers ---
function getActionLabel(type: PlanAction['type']): string {
  switch (type) {
    case 'create_page': return 'Create page';
    case 'create_section': return 'Add section';
    case 'create_note': return 'Add note';
    case 'delete_page': return 'Delete page';
    case 'delete_section': return 'Delete section';
    case 'delete_notes': return 'Delete notes';
    default: return 'Action';
  }
}

function ActionIcon({ type }: { type: PlanAction['type'] }) {
  const size = 12;
  const color = type.startsWith('delete') ? staticColors.danger : staticColors.textMuted;
  switch (type) {
    case 'create_page': return <FileText size={size} color={color} />;
    case 'create_section': return <FolderPlus size={size} color={color} />;
    case 'create_note': return <StickyNote size={size} color={color} />;
    case 'delete_page':
    case 'delete_section':
    case 'delete_notes': return <Trash2 size={size} color={color} />;
    default: return null;
  }
}

function getStatusDotColor(status: PlanGroupStatus, execState?: string): string {
  if (execState === 'complete') return staticColors.success;
  if (execState === 'executing') return '#4a9eff';
  switch (status) {
    case 'approved': return staticColors.primary;
    case 'skipped': return staticColors.textMuted;
    default: return staticColors.border;
  }
}

interface PlanCardProps {
  message: ChatMessage;
  messageIndex: number;
  onApproveGroup?: (messageIndex: number, groupIndex: number) => void;
  onSkipGroup?: (messageIndex: number, groupIndex: number) => void;
  onApproveAll?: (messageIndex: number) => void;
  onExecute?: (messageIndex: number) => void;
  onCancel?: (messageIndex: number) => void;
}

function PlanCard({
  message,
  messageIndex,
  onApproveGroup,
  onSkipGroup,
  onApproveAll,
  onExecute,
  onCancel,
}: PlanCardProps) {
  const colors = useTheme();
  const [expandedGroups, setExpandedGroups] = useState<Record<number, boolean>>({});
  const { planData, planGroupStatuses, planExecutionState } = message;
  if (!planData || !planGroupStatuses) return null;

  const isReviewing = planExecutionState === 'reviewing';
  const isExecuting = planExecutionState === 'executing';
  const isComplete = planExecutionState === 'complete';
  const hasApproved = planGroupStatuses.some((s: PlanGroupStatus) => s === 'approved');

  const toggleExpand = (groupIndex: number) => {
    setExpandedGroups(prev => ({ ...prev, [groupIndex]: !prev[groupIndex] }));
  };

  return (
    <View style={planStyles.container}>
      {/* Plan summary / agent message */}
      <View style={styles.messageRow}>
        <Text style={[styles.messageArrow, styles.arrowAgent, { color: colors.primary }]}>{'<-'}</Text>
        <Text style={[styles.messageText, styles.messageAgent]}>{message.content}</Text>
      </View>

      {/* Group cards */}
      <View style={planStyles.groupsContainer}>
        {planData.groups.map((group, gi) => {
          const status = planGroupStatuses[gi];
          const isExpanded = expandedGroups[gi] ?? false;
          const isSkipped = status === 'skipped';
          const isApproved = status === 'approved';

          const borderLeftColor = isComplete
            ? staticColors.success
            : isExecuting && isApproved
              ? '#4a9eff'
              : isApproved
                ? colors.primary
                : staticColors.border;

          return (
            <View
              key={group.id}
              style={[
                planStyles.groupCard,
                { borderLeftColor, borderLeftWidth: 3 },
                isSkipped && planStyles.groupSkipped,
              ]}
            >
              {/* Group header */}
              <TouchableOpacity
                style={planStyles.groupHeader}
                onPress={() => toggleExpand(gi)}
                activeOpacity={0.7}
              >
                <View style={[planStyles.statusDot, { backgroundColor: getStatusDotColor(status, isComplete ? 'complete' : isExecuting ? 'executing' : undefined) }]} />
                <Text
                  style={[
                    planStyles.groupDescription,
                    isSkipped && planStyles.groupDescriptionSkipped,
                  ]}
                  numberOfLines={isExpanded ? undefined : 2}
                >
                  {group.description}
                </Text>
                <View style={planStyles.groupMeta}>
                  <Text style={planStyles.actionCount}>{group.actionCount}</Text>
                  {isExpanded
                    ? <ChevronDown size={14} color={staticColors.textMuted} />
                    : <ChevronRight size={14} color={staticColors.textMuted} />
                  }
                </View>
              </TouchableOpacity>

              {/* Expanded: action list */}
              {isExpanded && (
                <View style={planStyles.actionList}>
                  {group.actions.map((action, ai) => (
                    <View key={ai} style={planStyles.actionRow}>
                      <ActionIcon type={action.type} />
                      <Text style={planStyles.actionText}>
                        {getActionLabel(action.type)}
                        {action.name || action.pageName || action.sectionName
                          ? `: ${action.name || action.pageName || action.sectionName}`
                          : ''}
                        {action.content ? ` — "${action.content}"` : ''}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Per-group buttons (only during review) */}
              {isReviewing && status === 'pending' && (
                <View style={planStyles.groupButtons}>
                  <TouchableOpacity
                    style={[planStyles.approveButton, { borderColor: colors.primary }]}
                    onPress={() => onApproveGroup?.(messageIndex, gi)}
                    activeOpacity={0.7}
                  >
                    <Check size={12} color={colors.primary} />
                    <Text style={[planStyles.approveText, { color: colors.primary }]}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={planStyles.skipButton}
                    onPress={() => onSkipGroup?.(messageIndex, gi)}
                    activeOpacity={0.7}
                  >
                    <X size={12} color={staticColors.textMuted} />
                    <Text style={planStyles.skipText}>Skip</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Status label for decided groups */}
              {isReviewing && status !== 'pending' && (
                <View style={planStyles.groupStatusLabel}>
                  <Text style={[
                    planStyles.statusText,
                    isApproved ? [planStyles.statusApproved, { color: colors.primary }] : planStyles.statusSkippedText,
                  ]}>
                    {isApproved ? 'Approved' : 'Skipped'}
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Footer buttons */}
      {isReviewing && (
        <View style={planStyles.footer}>
          <TouchableOpacity
            style={planStyles.approveAllButton}
            onPress={() => onApproveAll?.(messageIndex)}
            activeOpacity={0.7}
          >
            <Text style={planStyles.approveAllText}>Approve All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[planStyles.executeButton, { backgroundColor: colors.primary }, !hasApproved && planStyles.executeButtonDisabled]}
            onPress={() => hasApproved && onExecute?.(messageIndex)}
            activeOpacity={hasApproved ? 0.7 : 1}
            disabled={!hasApproved}
          >
            <Text style={[planStyles.executeText, !hasApproved && planStyles.executeTextDisabled]}>Execute</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={planStyles.cancelPlanButton}
            onPress={() => onCancel?.(messageIndex)}
            activeOpacity={0.7}
          >
            <Text style={planStyles.cancelPlanText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Executing state */}
      {isExecuting && (
        <View style={planStyles.executingFooter}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={planStyles.executingText}>Executing plan...</Text>
        </View>
      )}

      {/* Complete state */}
      {isComplete && (
        <View style={planStyles.completeFooter}>
          <Check size={14} color={staticColors.success} />
          <Text style={planStyles.completeText}>Plan complete</Text>
        </View>
      )}
    </View>
  );
}

interface ChatPanelProps {
  visible?: boolean;
  messages: ChatMessage[];
  processing: boolean;
  onSendMessage: (message: string, confirmedValue?: string | null) => void;
  onUserResponse: (response: string, messageIndex: number) => void;
  onPlanApproveGroup?: (messageIndex: number, groupIndex: number) => void;
  onPlanSkipGroup?: (messageIndex: number, groupIndex: number) => void;
  onPlanApproveAll?: (messageIndex: number) => void;
  onPlanExecute?: (messageIndex: number) => void;
  onPlanCancel?: (messageIndex: number) => void;
}

export default function ChatPanel({
  visible = true,
  messages,
  processing,
  onSendMessage,
  onUserResponse,
  onPlanApproveGroup,
  onPlanSkipGroup,
  onPlanApproveAll,
  onPlanExecute,
  onPlanCancel,
}: ChatPanelProps) {
  const insets = useSafeAreaInsets();
  const colors = useTheme();
  const { settings } = useSettingsStore();

  // Compute chat appearance colors from settings
  // Background: mode determines tint color, slider is opacity
  const chatBgTint = settings.chat_background_mode === 'accent' ? colors.primary : '#000000';
  const chatBgOpacity = settings.chat_background_brightness / 100;
  const chatAgentTextColor = computeChatColor(settings.chat_agent_text_mode, settings.chat_agent_text_brightness, colors.primary);
  const chatUserTextColor = computeChatColor(settings.chat_user_text_mode, settings.chat_user_text_brightness, colors.primary);

  const [height, setHeight] = useState(HEIGHTS.inputOnly);
  const [inputValue, setInputValue] = useState('');
  const [isListening, setIsListening] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const listRef = useRef<FlatList>(null);

  const panelHeight = useSharedValue(HEIGHTS.inputOnly);
  const dragStartHeightSV = useSharedValue(HEIGHTS.inputOnly);
  const isDraggingSV = useSharedValue(false);
  const micPulse = useSharedValue(1);

  // Waveform recording state
  const recordingExpansion = useSharedValue(0);
  const waveformTime = useSharedValue(0);
  const volumeLevel = useSharedValue(0);
  const inputAreaWidthSV = useSharedValue(300);

  // Waveform time driver: increments on each frame while recording
  const waveformFrameCallback = useFrameCallback((frameInfo) => {
    if (recordingExpansion.value > 0.5) {
      waveformTime.value += (frameInfo.timeSincePreviousFrame ?? 16) / 1000;
    }
  }, false); // starts inactive

  // Contract recording overlay
  const contractOverlay = useCallback(() => {
    waveformFrameCallback.setActive(false);
    volumeLevel.value = withTiming(0, { duration: 150 });
    recordingExpansion.value = withTiming(0, {
      duration: EXPANSION_DURATION,
      easing: Easing.inOut(Easing.ease),
    });
  }, [recordingExpansion, volumeLevel, waveformFrameCallback]);

  // Voice recognition setup
  useEffect(() => {
    Voice.onSpeechResults = (e: SpeechResultsEvent) => {
      if (e.value && e.value.length > 0) {
        setInputValue(e.value[0]);
      }
    };

    Voice.onSpeechVolumeChanged = (e: SpeechVolumeChangeEvent) => {
      // Smoothly animate to new volume level
      volumeLevel.value = withTiming(Math.max(0, e.value ?? 0), { duration: 100 });
    };

    Voice.onSpeechError = (_e: SpeechErrorEvent) => {
      setIsListening(false);
      micPulse.value = 1;
      contractOverlay();
    };

    Voice.onSpeechEnd = () => {
      setIsListening(false);
      micPulse.value = 1;
      contractOverlay();
    };

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, [micPulse, volumeLevel, contractOverlay]);

  const handleMicPress = useCallback(async () => {
    if (isListening) {
      await Voice.stop();
      setIsListening(false);
      micPulse.value = 1;
      contractOverlay();
    } else {
      try {
        setIsListening(true);
        micPulse.value = withRepeat(
          withSequence(
            withTiming(1.3, { duration: 600 }),
            withTiming(1, { duration: 600 }),
          ),
          -1,
          true,
        );
        // Expand overlay and start waveform
        waveformTime.value = 0;
        recordingExpansion.value = withTiming(1, {
          duration: EXPANSION_DURATION,
          easing: Easing.out(Easing.ease),
        });
        waveformFrameCallback.setActive(true);
        await Voice.start('en-US');
      } catch (_e) {
        setIsListening(false);
        micPulse.value = 1;
        contractOverlay();
      }
    }
  }, [isListening, micPulse, recordingExpansion, waveformTime, waveformFrameCallback, contractOverlay]);

  const micAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: micPulse.value }],
  }));

  // Recording overlay animated style
  const recordingOverlayStyle = useAnimatedStyle(() => {
    const expanded = recordingExpansion.value > 0.01;
    const width = interpolate(
      recordingExpansion.value,
      [0, 1],
      [48, inputAreaWidthSV.value],
    );
    return {
      width,
      opacity: recordingExpansion.value,
      pointerEvents: expanded ? 'auto' as const : 'none' as const,
    };
  });

  const handleStopRecording = useCallback(async () => {
    if (isListening) {
      await Voice.stop();
      setIsListening(false);
      micPulse.value = 1;
      contractOverlay();
    }
  }, [isListening, micPulse, contractOverlay]);

  const handleInputAreaLayout = useCallback((e: LayoutChangeEvent) => {
    inputAreaWidthSV.value = e.nativeEvent.layout.width;
  }, [inputAreaWidthSV]);

  // Batch state updates after drag ends
  const finishDrag = useCallback((newHeight: number) => {
    setHeight(newHeight);
  }, []);

  // Sync animated value for programmatic height changes
  useEffect(() => {
    if (!isDraggingSV.value) {
      panelHeight.value = withTiming(height, { duration: 300 });
    }
  }, [height, isDraggingSV, panelHeight]);

  // Auto-expand when messages arrive
  useEffect(() => {
    if (messages.length > 0 && height === HEIGHTS.inputOnly) {
      setHeight(HEIGHTS.small);
    }
  }, [messages.length, height]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0 && height > HEIGHTS.collapsed) {
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, height]);

  // Drag handle gesture — fully on UI thread using shared values
  const dragGesture = Gesture.Pan()
    .onStart(() => {
      isDraggingSV.value = true;
      dragStartHeightSV.value = panelHeight.value;
    })
    .onUpdate((event) => {
      const deltaY = -event.translationY;
      const minH = messages.length > 0 ? HEIGHTS.collapsed : HEIGHTS.inputOnly;
      const newHeight = Math.max(minH, Math.min(HEIGHTS.large, dragStartHeightSV.value + deltaY));
      panelHeight.value = newHeight;
    })
    .onEnd(() => {
      const currentH = panelHeight.value;
      const minSnap = messages.length > 0 ? HEIGHTS.collapsed : HEIGHTS.inputOnly;
      const snapPoints = [minSnap, HEIGHTS.small, HEIGHTS.medium, HEIGHTS.large];
      let closest = snapPoints[0];
      for (let i = 1; i < snapPoints.length; i++) {
        if (Math.abs(snapPoints[i] - currentH) < Math.abs(closest - currentH)) {
          closest = snapPoints[i];
        }
      }
      panelHeight.value = withTiming(closest, { duration: 300 });
      isDraggingSV.value = false;
      runOnJS(finishDrag)(closest);
    });

  // Visibility animation
  const panelOpacity = useSharedValue(1);

  useEffect(() => {
    panelOpacity.value = withTiming(visible ? 1 : 0, { duration: 200 });
  }, [visible, panelOpacity]);

  const animatedPanelStyle = useAnimatedStyle(() => ({
    height: panelHeight.value,
    opacity: panelOpacity.value,
    pointerEvents: panelOpacity.value === 0 ? 'none' as const : 'auto' as const,
  }));

  const handleSend = useCallback(async () => {
    if (!inputValue.trim()) return;

    if (isListening) {
      await Voice.stop();
      setIsListening(false);
      micPulse.value = 1;
      contractOverlay();
    }

    onSendMessage(inputValue.trim());
    setInputValue('');
  }, [inputValue, isListening, micPulse, onSendMessage, contractOverlay]);

  const handleExpand = useCallback(() => {
    setHeight(HEIGHTS.small);
  }, []);

  const showMessages = height > HEIGHTS.collapsed;

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isUser = item.role === 'user';
    const isError = item.type === 'error';
    const isClarification = item.type === 'clarification' && !item.responded;
    const isConfirmation = item.type === 'bulk_confirmation' && !item.responded;

    // Plan proposal — render PlanCard
    if (item.type === 'plan_proposal' && item.planData) {
      return (
        <PlanCard
          message={item}
          messageIndex={index}
          onApproveGroup={onPlanApproveGroup}
          onSkipGroup={onPlanSkipGroup}
          onApproveAll={onPlanApproveAll}
          onExecute={onPlanExecute}
          onCancel={onPlanCancel}
        />
      );
    }

    return (
      <Pressable
        style={styles.messageContainer}
        onLongPress={() => {
          Vibration.vibrate(30);
          Share.share({ message: item.content });
        }}
      >
        {/* Message row */}
        <View style={styles.messageRow}>
          <Text style={[styles.messageArrow, isUser ? styles.arrowUser : styles.arrowAgent, !isUser && { color: colors.primary }]}>
            {isUser ? '→' : '←'}
          </Text>
          <Text
            selectable={true}
            style={[
              styles.messageText,
              isUser ? styles.messageUser : styles.messageAgent,
              isUser ? { color: chatUserTextColor } : { color: chatAgentTextColor },
              isError && styles.messageError,
            ]}
          >
            {item.content}
          </Text>
        </View>

        {/* Clarification options */}
        {isClarification && item.options && (
          <View style={styles.actionButtons}>
            {item.options.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={styles.optionButton}
                onPress={() => onUserResponse(option.value, index)}
                activeOpacity={0.7}
              >
                <Text style={styles.optionText}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Confirmation buttons */}
        {isConfirmation && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.confirmButton, { borderColor: colors.primary }]}
              onPress={() => onUserResponse('yes', index)}
              activeOpacity={0.7}
            >
              <Text style={[styles.confirmText, { color: colors.primary }]}>Yes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => onUserResponse('no', index)}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelText}>No</Text>
            </TouchableOpacity>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <>
    <InputAccessoryView nativeID={INPUT_ACCESSORY_ID}>
      <View style={styles.accessoryBar}>
        <TouchableOpacity onPress={() => Keyboard.dismiss()} activeOpacity={0.7}>
          <Text style={[styles.doneButton, { color: colors.primary }]}>Done</Text>
        </TouchableOpacity>
      </View>
    </InputAccessoryView>
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'position' : undefined}
      keyboardVerticalOffset={0}
      style={styles.keyboardAvoid}
    >
      <Animated.View
        style={[
          styles.container,
          animatedPanelStyle,
          { bottom: insets.bottom + 12 },
        ]}
      >
        {/* Blur background — wrapped to clip within border radius */}
        <View style={styles.blurWrapper}>
          <BlurView
            style={StyleSheet.absoluteFill}
            blurType="ultraThinMaterialDark"
            blurAmount={20}
            reducedTransparencyFallbackColor="rgba(12, 12, 12, 0.9)"
          />
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <View style={{ flex: 1, backgroundColor: chatBgTint, opacity: chatBgOpacity }} />
          </View>
        </View>

        {/* Drag handle - show when expanded and has messages */}
        {height > HEIGHTS.collapsed && messages.length > 0 && (
          <GestureDetector gesture={dragGesture}>
            <View style={styles.dragHandleContainer}>
              <View style={styles.dragHandle} />
            </View>
          </GestureDetector>
        )}

        {/* Messages area */}
        {showMessages && (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item, i) => `${item.timestamp}-${i}`}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            style={styles.messagesContainer}
          />
        )}

        {/* Collapsed indicator - show when collapsed and has messages */}
        {!showMessages && messages.length > 0 && height <= HEIGHTS.collapsed && (
          <TouchableOpacity
            style={styles.expandButton}
            onPress={handleExpand}
            activeOpacity={0.7}
          >
            <Text style={styles.expandArrow}>↑</Text>
            <Text style={styles.expandText}>Expand conversation</Text>
            <Text style={styles.expandArrow}>↑</Text>
          </TouchableOpacity>
        )}

        {/* Input area */}
        <View style={styles.inputArea} onLayout={handleInputAreaLayout}>
          {/* Voice button */}
          <TouchableOpacity
            style={styles.voiceButton}
            onPress={handleMicPress}
            activeOpacity={0.7}
          >
            <Animated.View style={micAnimStyle}>
              <Mic
                size={24}
                color={isListening ? colors.primary : staticColors.textMuted}
              />
            </Animated.View>
          </TouchableOpacity>

          <TextInput
            ref={inputRef}
            value={inputValue}
            onChangeText={setInputValue}
            placeholder={isListening ? 'Listening...' : 'Type or speak...'}
            placeholderTextColor={isListening ? colors.primary : staticColors.textMuted}
            style={styles.input}
            multiline={false}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            inputAccessoryViewID={INPUT_ACCESSORY_ID}
          />

          {/* Processing indicator or send button */}
          {processing ? (
            <View style={styles.sendButton}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.sendButton, !inputValue.trim() && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!inputValue.trim()}
              activeOpacity={0.7}
            >
              <Send size={18} color={staticColors.textPrimary} />
            </TouchableOpacity>
          )}

          {/* Recording waveform overlay */}
          <Animated.View style={[styles.recordingOverlay, recordingOverlayStyle]}>
            <View style={styles.waveformContainer}>
              {Array.from({ length: WAVEFORM_BAR_COUNT }, (_, i) => (
                <WaveformBar key={i} index={i} waveformTime={waveformTime} volumeLevel={volumeLevel} />
              ))}
            </View>
            <TouchableOpacity
              style={styles.stopButton}
              onPress={handleStopRecording}
              activeOpacity={0.7}
            >
              <Square size={16} color={staticColors.textPrimary} fill={staticColors.textPrimary} />
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 0,
    zIndex: 900,
  },
  container: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 32,
    elevation: 20,
  },
  blurWrapper: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 11,
    overflow: 'hidden',
  },
  dragHandleContainer: {
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 12,
    marginTop: -12,
  },
  dragHandle: {
    width: 48,
    height: 5,
    backgroundColor: staticColors.textMuted,
    borderRadius: 3,
    opacity: 0.5,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesList: {
    padding: 12,
    paddingHorizontal: 20,
  },
  messageContainer: {
    marginBottom: 10,
  },
  messageRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  messageArrow: {
    fontSize: 11,
    flexShrink: 0,
  },
  arrowUser: {
    color: staticColors.textMuted,
    opacity: 0.6,
  },
  arrowAgent: {
    color: staticColors.primary,
  },
  messageText: {
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  messageUser: {
    color: staticColors.textPrimary,
  },
  messageAgent: {
    color: staticColors.textSecondary,
  },
  messageError: {
    color: staticColors.error,
  },
  // Action buttons for clarification/confirmation
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    marginLeft: 19, // align with message text (arrow width + gap)
  },
  optionButton: {
    borderWidth: 1,
    borderColor: staticColors.border,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  optionText: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: staticColors.textPrimary,
  },
  confirmButton: {
    borderWidth: 1,
    borderColor: staticColors.primary,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  confirmText: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: staticColors.primary,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: staticColors.border,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  cancelText: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: staticColors.textMuted,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  expandArrow: {
    fontFamily: theme.fonts.regular,
    fontSize: 9,
    color: staticColors.textMuted,
    opacity: 0.6,
  },
  expandText: {
    fontFamily: theme.fonts.semibold,
    fontSize: 9,
    color: staticColors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 10,
    marginTop: 'auto',
  },
  voiceButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontFamily: theme.fonts.regular,
    fontSize: 16,
    color: staticColors.textPrimary,
    padding: 0,
  },
  sendButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  accessoryBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: staticColors.surface,
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  doneButton: {
    fontFamily: theme.fonts.semibold,
    fontSize: 15,
    color: staticColors.primary,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  recordingOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 10, 10, 0.95)',
    paddingLeft: 58, // clears mic button area
    paddingRight: 8,
    overflow: 'hidden',
  },
  waveformContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: WAVEFORM_HEIGHT,
  },
  stopButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    marginLeft: 8,
  },
});

const planStyles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  groupsContainer: {
    marginTop: 10,
    marginLeft: 19,
    gap: 8,
  },
  groupCard: {
    borderWidth: 1,
    borderColor: staticColors.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  groupSkipped: {
    opacity: 0.5,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  groupDescription: {
    flex: 1,
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: staticColors.textPrimary,
  },
  groupDescriptionSkipped: {
    textDecorationLine: 'line-through',
    color: staticColors.textMuted,
  },
  groupMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionCount: {
    fontFamily: theme.fonts.regular,
    fontSize: 11,
    color: staticColors.textMuted,
  },
  actionList: {
    marginTop: 8,
    marginLeft: 16,
    gap: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: staticColors.textSecondary,
    flex: 1,
  },
  groupButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    marginLeft: 16,
  },
  approveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: staticColors.primary,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  approveText: {
    fontFamily: theme.fonts.medium,
    fontSize: 11,
    color: staticColors.primary,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: staticColors.border,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  skipText: {
    fontFamily: theme.fonts.medium,
    fontSize: 11,
    color: staticColors.textMuted,
  },
  groupStatusLabel: {
    marginTop: 8,
    marginLeft: 16,
  },
  statusText: {
    fontFamily: theme.fonts.medium,
    fontSize: 11,
  },
  statusApproved: {
    color: staticColors.primary,
  },
  statusSkippedText: {
    color: staticColors.textMuted,
  },
  footer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    marginLeft: 19,
  },
  approveAllButton: {
    borderWidth: 1,
    borderColor: staticColors.border,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  approveAllText: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: staticColors.textPrimary,
  },
  executeButton: {
    backgroundColor: staticColors.primary,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  executeButtonDisabled: {
    backgroundColor: staticColors.border,
  },
  executeText: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: staticColors.bg,
  },
  executeTextDisabled: {
    color: staticColors.textMuted,
  },
  cancelPlanButton: {
    borderWidth: 1,
    borderColor: staticColors.border,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  cancelPlanText: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: staticColors.textMuted,
  },
  executingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    marginLeft: 19,
  },
  executingText: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: staticColors.textSecondary,
  },
  completeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    marginLeft: 19,
  },
  completeText: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: staticColors.success,
  },
});
