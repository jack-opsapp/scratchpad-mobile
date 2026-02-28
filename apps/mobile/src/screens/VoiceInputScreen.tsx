import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Linking,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
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

// Waveform constants — hero display (2x ChatPanel)
const WAVEFORM_BAR_COUNT = 48;
const WAVEFORM_BAR_WIDTH = 3;
const WAVEFORM_BAR_GAP = 2;
const WAVEFORM_MAX_HEIGHT = 80;
const WAVEFORM_MIN_HEIGHT = 4;
const WAVEFORM_MAX_HEIGHT_SMALL = 40;

type ScreenState = 'recording' | 'review' | 're-recording';

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
  const mountedRef = useRef(true);

  // Use refs for values needed in the transcript callback
  const screenStateRef = useRef<ScreenState>('recording');
  screenStateRef.current = screenState;
  const cursorPositionRef = useRef(0);
  cursorPositionRef.current = cursorPosition;

  // Track mounted state for async cleanup
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Stable transcript change handler — reads from refs, never changes identity
  const onTranscriptChange = useCallback((newTranscript: string) => {
    if (screenStateRef.current === 'recording') {
      setText(newTranscript);
    } else if (screenStateRef.current === 're-recording') {
      const pos = cursorPositionRef.current;
      setText((prev) => {
        const before = prev.slice(0, pos);
        const after = prev.slice(pos);
        const needsSpace = before.length > 0 && !before.endsWith(' ') && !newTranscript.startsWith(' ');
        return before + (needsSpace ? ' ' : '') + newTranscript + after;
      });
    }
  }, []);

  const {
    isListening,
    error,
    volumeLevel,
    waveformTime,
    startRecording,
    stopRecording,
    resetTranscript,
  } = useVoiceInput({ onTranscriptChange });

  // Auto-start recording on mount
  useEffect(() => {
    if (autoStartedRef.current) return;
    autoStartedRef.current = true;
    const timer = setTimeout(() => {
      if (mountedRef.current) startRecording();
    }, 300);
    return () => clearTimeout(timer);
  }, [startRecording]);

  // Detect permission errors
  useEffect(() => {
    if (error && (
      error.toLowerCase().includes('permission') ||
      error.toLowerCase().includes('not authorized') ||
      error.toLowerCase().includes('denied') ||
      error.toLowerCase().includes('not available')
    )) {
      setPermissionDenied(true);
    }
  }, [error]);

  const handleStop = useCallback(async () => {
    await stopRecording();
    setScreenState('review');
  }, [stopRecording]);

  const handleReRecord = useCallback(async () => {
    resetTranscript();
    setScreenState('re-recording');
    await startRecording();
  }, [startRecording, resetTranscript]);

  const handleClear = useCallback(async () => {
    await stopRecording();
    setText('');
    resetTranscript();
    setScreenState('recording');
    setTimeout(() => {
      if (mountedRef.current) startRecording();
    }, 300);
  }, [stopRecording, resetTranscript, startRecording]);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    await stopRecording();
    navigation.navigate('Main', { voiceMessage: trimmed });
  }, [text, stopRecording, navigation]);

  const handleClose = useCallback(async () => {
    await stopRecording();
    navigation.goBack();
  }, [stopRecording, navigation]);

  const handleSelectionChange = useCallback(
    (e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
      setCursorPosition(e.nativeEvent.selection.start);
    },
    [],
  );

  const hasText = text.trim().length > 0;

  // --- Permission denied ---
  if (permissionDenied) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <StatusBar barStyle="light-content" />
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
        <StatusBar barStyle="light-content" />
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={20} color={staticColors.textMuted} />
          </TouchableOpacity>
        </View>

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
      <KeyboardAvoidingView
        style={[styles.container, { paddingTop: insets.top }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <StatusBar barStyle="light-content" />
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

        <View style={[styles.actionBar, { paddingBottom: insets.bottom || 16 }]}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleClear}
            activeOpacity={0.7}
          >
            <Trash2 size={20} color={staticColors.danger} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleReRecord}
            activeOpacity={0.7}
          >
            <Mic size={20} color={colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              { borderColor: hasText ? colors.primary : staticColors.border },
              !hasText && { opacity: 0.4 },
            ]}
            onPress={handleSend}
            activeOpacity={0.7}
            disabled={!hasText}
          >
            <Send size={20} color={hasText ? staticColors.textPrimary : staticColors.textMuted} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // --- Re-recording state ---
  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="light-content" />
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

      <View style={styles.reRecordStopContainer}>
        <TouchableOpacity
          style={styles.stopButton}
          onPress={handleStop}
          activeOpacity={0.7}
        >
          <Square size={24} color={staticColors.textPrimary} fill={staticColors.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.textContainer}>
        <TextInput
          style={[styles.textInput, { color: staticColors.textSecondary }]}
          value={text}
          multiline
          scrollEnabled
          editable={false}
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
  stateLabel: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 11,
    color: staticColors.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginTop: 8,
  },
  recordingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  stopButton: {
    width: 64,
    height: 64,
    borderWidth: 1,
    borderColor: staticColors.border,
    borderRadius: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  reRecordStopContainer: {
    alignItems: 'center',
  },
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
  actionBar: {
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
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
