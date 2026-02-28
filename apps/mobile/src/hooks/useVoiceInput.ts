import { useState, useEffect, useCallback, useRef } from 'react';
import {
  useSharedValue,
  withTiming,
  Easing,
  useFrameCallback,
  type SharedValue,
} from 'react-native-reanimated';
import Voice, {
  SpeechResultsEvent,
  SpeechErrorEvent,
  SpeechVolumeChangeEvent,
} from '@react-native-voice/voice';

const EXPANSION_DURATION = 350;

export interface UseVoiceInputOptions {
  language?: string;
  onTranscriptChange?: (text: string) => void;
}

export interface UseVoiceInputReturn {
  isListening: boolean;
  transcript: string;
  error: string | null;
  volumeLevel: SharedValue<number>;
  waveformTime: SharedValue<number>;
  recordingExpansion: SharedValue<number>;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  resetTranscript: () => void;
}

export function useVoiceInput(options: UseVoiceInputOptions = {}): UseVoiceInputReturn {
  const { language = 'en-US', onTranscriptChange } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Use refs for values needed in Voice callbacks to avoid stale closures
  const isListeningRef = useRef(false);
  const onTranscriptChangeRef = useRef(onTranscriptChange);
  onTranscriptChangeRef.current = onTranscriptChange;

  // Animation shared values
  const recordingExpansion = useSharedValue(0);
  const waveformTime = useSharedValue(0);
  const volumeLevel = useSharedValue(0);

  // Waveform time driver
  const waveformFrameCallback = useFrameCallback((frameInfo) => {
    if (recordingExpansion.value > 0.5) {
      waveformTime.value += (frameInfo.timeSincePreviousFrame ?? 16) / 1000;
    }
  }, false);

  const contractOverlay = useCallback(() => {
    waveformFrameCallback.setActive(false);
    volumeLevel.value = withTiming(0, { duration: 150 });
    recordingExpansion.value = withTiming(0, {
      duration: EXPANSION_DURATION,
      easing: Easing.inOut(Easing.ease),
    });
  }, [recordingExpansion, volumeLevel, waveformFrameCallback]);

  // Voice event listeners — stable deps, uses refs for mutable values
  useEffect(() => {
    Voice.onSpeechResults = (e: SpeechResultsEvent) => {
      if (e.value && e.value.length > 0) {
        const text = e.value[0];
        setTranscript(text);
        onTranscriptChangeRef.current?.(text);
      }
    };

    Voice.onSpeechVolumeChanged = (e: SpeechVolumeChangeEvent) => {
      volumeLevel.value = withTiming(Math.max(0, e.value ?? 0), { duration: 100 });
    };

    Voice.onSpeechError = (e: SpeechErrorEvent) => {
      isListeningRef.current = false;
      setIsListening(false);
      setError(e.error?.message ?? 'Speech recognition error');
      contractOverlay();
    };

    Voice.onSpeechEnd = () => {
      isListeningRef.current = false;
      setIsListening(false);
      contractOverlay();
    };

    return () => {
      // Stop active recording before destroying
      if (isListeningRef.current) {
        Voice.stop().catch(() => {});
      }
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, [volumeLevel, contractOverlay]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      isListeningRef.current = true;
      setIsListening(true);
      waveformTime.value = 0;
      recordingExpansion.value = withTiming(1, {
        duration: EXPANSION_DURATION,
        easing: Easing.out(Easing.ease),
      });
      waveformFrameCallback.setActive(true);
      await Voice.start(language);
    } catch (_e) {
      isListeningRef.current = false;
      setIsListening(false);
      setError('Failed to start recording');
      contractOverlay();
    }
  }, [language, recordingExpansion, waveformTime, waveformFrameCallback, contractOverlay]);

  const stopRecording = useCallback(async () => {
    if (!isListeningRef.current) return;
    try {
      await Voice.stop();
    } catch (_e) {
      // Voice.stop can throw if already stopped
    }
    isListeningRef.current = false;
    setIsListening(false);
    contractOverlay();
  }, [contractOverlay]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setError(null);
  }, []);

  return {
    isListening,
    transcript,
    error,
    volumeLevel,
    waveformTime,
    recordingExpansion,
    startRecording,
    stopRecording,
    resetTranscript,
  };
}
