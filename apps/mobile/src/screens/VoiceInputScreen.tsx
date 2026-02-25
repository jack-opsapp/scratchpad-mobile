import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Linking,
  NativeSyntheticEvent,
  TextInputSelectionChangeEventData,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  SharedValue,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Square, X, Mic, Trash2, Send } from 'lucide-react-native';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { useTheme } from '../contexts/ThemeContext';
import { colors as staticColors } from '../styles';

// --- Waveform constants (2x ChatPanel) ---
const WAVEFORM_BAR_COUNT = 48;
const WAVEFORM_BAR_WIDTH = 3;
const WAVEFORM_BAR_GAP = 2;
const WAVEFORM_MAX_HEIGHT = 80;
const WAVEFORM_MIN_HEIGHT = 4;
const WAVEFORM_MAX_HEIGHT_SMALL = 40;

// --- Screen states ---
type ScreenState = 'recording' | 'review' | 're-recording';

// --- WaveformBar component ---
const WaveformBar = React.memo(({
  index,
  waveformTime,
  volumeLevel,
  accentColor,
  maxHeight,
}: {
  index: number;
  waveformTime: SharedValue<number>;
  volumeLevel: SharedValue<number>;
  accentColor: string;
  maxHeight: number;
}) => {
  const animStyle = useAnimatedStyle(() => {
    const t = waveformTime.value;
    const vol = volumeLevel.value;
    const phase = index * 0.55;
    const variation = Math.sin(t * 4.0 + phase) * 0.3 + 0.7;
    const normalizedVol = Math.min(vol / 7, 1.0);
    const height = Math.max(WAVEFORM_MIN_HEIGHT, normalizedVol * variation * maxHeight);
    return {
      height,
      width: WAVEFORM_BAR_WIDTH,
      backgroundColor: accentColor,
      borderRadius: WAVEFORM_BAR_WIDTH / 2,
      marginHorizontal: WAVEFORM_BAR_GAP / 2,
    };
  });
  return <Animated.View style={animStyle} />;
});

// --- Main screen component ---
export default function VoiceInputScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const colors = useTheme();

  const [screenState, setScreenState] = useState<ScreenState>('recording');
  const [text, setText] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const textInputRef = useRef<TextInput>(null);
  const autoStartedRef = useRef(false);

  // Callback for transcript changes: depends on screen state
  const onTranscriptChange = useCallback((newTranscript: string) => {
    if (screenState === 'recording') {
      // In initial recording, replace text entirely
      setText(newTranscript);
    } else if (screenState === 're-recording') {
      // In re-recording, insert at saved cursor position
      setText((prev) => {
        const before = prev.slice(0, cursorPosition);
        const after = prev.slice(cursorPosition);
        // Add a space before if needed
        const needsSpace = before.length > 0 && !before.endsWith(' ') && !newTranscript.startsWith(' ');
        return before + (needsSpace ? ' ' : '') + newTranscript + after;
      });
    }
  }, [screenState, cursorPosition]);

  const {
    isListening,
    transcript,
    error,
    volumeLevel,
    waveformTime,
    startRecording,
    stopRecording,
    resetTranscript,
  } = useVoiceInput({ onTranscriptChange });

  // Auto-start recording on mount with 300ms delay
  useEffect(() => {
    if (autoStartedRef.current) return;
    autoStartedRef.current = true;
    const timer = setTimeout(async () => {
      try {
        await startRecording();
      } catch (_e) {
        // Check if this is a permission error
        setPermissionDenied(true);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [startRecording]);

  // Detect permission denied from error string
  useEffect(() => {
    if (error && (
      error.toLowerCase().includes('permission') ||
      error.toLowerCase().includes('not authorized') ||
      error.toLowerCase().includes('denied')
    )) {
      setPermissionDenied(true);
    }
  }, [error]);

  // Handle stop button press
  const handleStop = useCallback(async () => {
    await stopRecording();
    if (screenState === 'recording') {
      setScreenState('review');
    } else if (screenState === 're-recording') {
      setScreenState('review');
    }
  }, [stopRecording, screenState]);

  // Handle re-record from review state
  const handleReRecord = useCallback(async () => {
    resetTranscript();
    setScreenState('re-recording');
    try {
      await startRecording();
    } catch (_e) {
      setPermissionDenied(true);
    }
  }, [startRecording, resetTranscript]);

  // Handle clear: reset everything, go back to recording
  const handleClear = useCallback(async () => {
    if (isListening) {
      await stopRecording();
    }
    setText('');
    resetTranscript();
    setScreenState('recording');
    // Auto-start recording again after a brief delay
    setTimeout(async () => {
      try {
        await startRecording();
      } catch (_e) {
        setPermissionDenied(true);
      }
    }, 300);
  }, [isListening, stopRecording, resetTranscript, startRecording]);

  // Handle send: navigate to Main with the voice message
  const handleSend = useCallback(() => {
    if (!text.trim()) return;
    navigation.navigate('Main', { voiceMessage: text.trim() });
  }, [text, navigation]);

  // Handle close
  const handleClose = useCallback(async () => {
    if (isListening) {
      await stopRecording();
    }
    navigation.goBack();
  }, [isListening, stopRecording, navigation]);

  // Track cursor position
  const handleSelectionChange = useCallback(
    (e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
      setCursorPosition(e.nativeEvent.selection.start);
    },
    [],
  );

  // --- Permission denied state ---
  if (permissionDenied) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        {/* Close button */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={20} color={staticColors.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.permissionContainer}>
          <Text style={styles.permissionTitle}>MICROPHONE ACCESS REQUIRED</Text>
          <Text style={styles.permissionBody}>
            Enable microphone access in Settings to use voice input.
          </Text>
          <TouchableOpacity
            style={styles.openSettingsButton}
            onPress={() => Linking.openSettings()}
          >
            <Text style={styles.openSettingsText}>OPEN SETTINGS</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // --- Recording state ---
  if (screenState === 'recording') {
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.recordingContent}>
          <Text style={styles.stateLabel}>LISTENING</Text>

          <View style={styles.waveformContainer}>
            {Array.from({ length: WAVEFORM_BAR_COUNT }, (_, i) => (
              <WaveformBar
                key={i}
                index={i}
                waveformTime={waveformTime}
                volumeLevel={volumeLevel}
                accentColor={colors.primary}
                maxHeight={WAVEFORM_MAX_HEIGHT}
              />
            ))}
          </View>

          <TouchableOpacity
            style={styles.stopButton}
            onPress={handleStop}
            activeOpacity={0.7}
          >
            <Square size={24} color={staticColors.textPrimary} fill={staticColors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // --- Review state ---
  if (screenState === 'review') {
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        {/* Close button */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={20} color={staticColors.textMuted} />
          </TouchableOpacity>
        </View>

        <Text style={styles.stateLabel}>REVIEW</Text>

        {/* Editable text area */}
        <View style={styles.textContainer}>
          <TextInput
            ref={textInputRef}
            style={styles.textInput}
            value={text}
            onChangeText={setText}
            onSelectionChange={handleSelectionChange}
            multiline
            scrollEnabled
            placeholder="Tap to edit..."
            placeholderTextColor={staticColors.textMuted}
            autoCorrect={false}
            textAlignVertical="top"
          />
        </View>

        {/* Action bar */}
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleClear}
            activeOpacity={0.7}
          >
            <Trash2 size={20} color={staticColors.danger} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { borderColor: staticColors.border }]}
            onPress={handleReRecord}
            activeOpacity={0.7}
          >
            <Mic size={20} color={colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { borderColor: colors.primary }]}
            onPress={handleSend}
            activeOpacity={0.7}
          >
            <Send size={20} color={staticColors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // --- Re-recording state ---
  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Close button */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleClose}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <X size={20} color={staticColors.textMuted} />
        </TouchableOpacity>
      </View>

      <Text style={styles.stateLabel}>LISTENING</Text>

      {/* Smaller waveform */}
      <View style={styles.waveformContainerSmall}>
        {Array.from({ length: WAVEFORM_BAR_COUNT }, (_, i) => (
          <WaveformBar
            key={i}
            index={i}
            waveformTime={waveformTime}
            volumeLevel={volumeLevel}
            accentColor={colors.primary}
            maxHeight={WAVEFORM_MAX_HEIGHT_SMALL}
          />
        ))}
      </View>

      {/* Stop button */}
      <View style={styles.reRecordStopContainer}>
        <TouchableOpacity
          style={styles.stopButton}
          onPress={handleStop}
          activeOpacity={0.7}
        >
          <Square size={24} color={staticColors.textPrimary} fill={staticColors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Non-editable text display */}
      <View style={styles.textContainer}>
        <TextInput
          style={styles.textInput}
          value={text}
          multiline
          scrollEnabled
          editable={false}
          placeholder="Tap to edit..."
          placeholderTextColor={staticColors.textMuted}
          textAlignVertical="top"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: staticColors.bg,
  },

  // --- Top bar ---
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 56,
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // --- State label ---
  stateLabel: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 11,
    color: staticColors.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginTop: 8,
  },

  // --- Recording state ---
  recordingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // --- Waveform ---
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: WAVEFORM_MAX_HEIGHT,
    marginTop: 32,
  },
  waveformContainerSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 80,
    marginTop: 24,
  },

  // --- Stop button ---
  stopButton: {
    width: 64,
    height: 64,
    borderWidth: 1,
    borderColor: staticColors.border,
    borderRadius: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reRecordStopContainer: {
    alignItems: 'center',
    marginTop: 24,
  },

  // --- Text area ---
  textContainer: {
    flex: 1,
    marginTop: 16,
  },
  textInput: {
    flex: 1,
    fontFamily: 'Manrope-Regular',
    fontSize: 16,
    color: staticColors.textPrimary,
    lineHeight: 24,
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingHorizontal: 24,
    paddingTop: 8,
    textAlignVertical: 'top',
  },

  // --- Action bar ---
  actionBar: {
    height: 72,
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderColor: staticColors.border,
    borderRadius: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // --- Permission denied ---
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  permissionTitle: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 11,
    color: staticColors.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  permissionBody: {
    fontFamily: 'Manrope-Regular',
    fontSize: 14,
    color: staticColors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },
  openSettingsButton: {
    marginTop: 24,
    borderWidth: 1,
    borderColor: staticColors.border,
    borderRadius: 2,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  openSettingsText: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 11,
    color: staticColors.textPrimary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});
