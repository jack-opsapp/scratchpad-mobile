import { useState, useEffect, useCallback } from 'react';
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
  language?: string; // default: 'en-US'
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

  // Animation shared values
  const recordingExpansion = useSharedValue(0);
  const waveformTime = useSharedValue(0);
  const volumeLevel = useSharedValue(0);

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
        const text = e.value[0];
        setTranscript(text);
        onTranscriptChange?.(text);
      }
    };

    Voice.onSpeechVolumeChanged = (e: SpeechVolumeChangeEvent) => {
      // Smoothly animate to new volume level
      volumeLevel.value = withTiming(Math.max(0, e.value ?? 0), { duration: 100 });
    };

    Voice.onSpeechError = (_e: SpeechErrorEvent) => {
      setIsListening(false);
      setError(_e.error?.message ?? 'Speech recognition error');
      contractOverlay();
    };

    Voice.onSpeechEnd = () => {
      setIsListening(false);
      contractOverlay();
    };

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, [volumeLevel, contractOverlay, onTranscriptChange]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setIsListening(true);
      // Expand overlay and start waveform
      waveformTime.value = 0;
      recordingExpansion.value = withTiming(1, {
        duration: EXPANSION_DURATION,
        easing: Easing.out(Easing.ease),
      });
      waveformFrameCallback.setActive(true);
      await Voice.start(language);
    } catch (_e) {
      setIsListening(false);
      setError('Failed to start recording');
      contractOverlay();
    }
  }, [language, recordingExpansion, waveformTime, waveformFrameCallback, contractOverlay]);

  const stopRecording = useCallback(async () => {
    if (isListening) {
      await Voice.stop();
      setIsListening(false);
      contractOverlay();
    }
  }, [isListening, contractOverlay]);

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
