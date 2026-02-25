# Action Button Voice Input — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** iPhone Action Button triggers a dedicated voice recording screen that sends transcribed speech to AI chat.

**Architecture:** Native Swift ControlWidget extension opens the app via `slate://voice-input` deep link. React Native handles the deep link, navigates to a new VoiceInputScreen. Voice logic extracted from ChatPanel into a shared `useVoiceInput` hook.

**Tech Stack:** Swift (WidgetKit + AppIntents), React Native, @react-native-voice/voice, react-native-reanimated, @react-navigation/native

---

### Task 1: Register `slate://` URL Scheme in Info.plist

**Files:**
- Modify: `apps/mobile/ios/SlateApp/Info.plist:23-35` (add to existing CFBundleURLTypes array)

**Step 1: Add the URL scheme**

Add a new URL type entry to the existing `CFBundleURLTypes` array in Info.plist. The Google Sign-In scheme is already there — add `slate` alongside it:

```xml
<dict>
  <key>CFBundleTypeRole</key>
  <string>Editor</string>
  <key>CFBundleURLName</key>
  <string>co.opsapp.slate</string>
  <key>CFBundleURLSchemes</key>
  <array>
    <string>slate</string>
  </array>
</dict>
```

**Step 2: Verify**

Open Info.plist and confirm both URL types exist (Google + slate).

**Step 3: Commit**

```bash
git add apps/mobile/ios/SlateApp/Info.plist
git commit -m "feat: register slate:// URL scheme for deep linking"
```

---

### Task 2: Extract `useVoiceInput` Hook from ChatPanel

**Files:**
- Create: `apps/mobile/src/hooks/useVoiceInput.ts`
- Modify: `apps/mobile/src/components/ChatPanel.tsx`

**Step 1: Create the shared hook**

Extract voice state and logic from ChatPanel.tsx (lines 393, 402-408, 601-710) into a new hook.

```typescript
// apps/mobile/src/hooks/useVoiceInput.ts
import { useState, useEffect, useCallback } from 'react';
import {
  useSharedValue,
  useFrameCallback,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Voice, {
  SpeechResultsEvent,
  SpeechErrorEvent,
  SpeechVolumeChangeEvent,
} from '@react-native-voice/voice';

const EXPANSION_DURATION = 350;

interface UseVoiceInputOptions {
  /** Language for speech recognition. Default: 'en-US' */
  language?: string;
  /** Called when transcript updates */
  onTranscriptChange?: (text: string) => void;
}

export function useVoiceInput(options: UseVoiceInputOptions = {}) {
  const { language = 'en-US', onTranscriptChange } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Animation shared values
  const volumeLevel = useSharedValue(0);
  const waveformTime = useSharedValue(0);
  const recordingExpansion = useSharedValue(0);

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

  // Voice event listeners
  useEffect(() => {
    Voice.onSpeechResults = (e: SpeechResultsEvent) => {
      if (e.value && e.value.length > 0) {
        const text = e.value[0];
        setTranscript(text);
        onTranscriptChange?.(text);
      }
    };

    Voice.onSpeechVolumeChanged = (e: SpeechVolumeChangeEvent) => {
      volumeLevel.value = withTiming(Math.max(0, e.value ?? 0), { duration: 100 });
    };

    Voice.onSpeechError = (_e: SpeechErrorEvent) => {
      setIsListening(false);
      setError('Speech recognition error');
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
```

**Step 2: Refactor ChatPanel to use the hook**

In `ChatPanel.tsx`:
- Import `useVoiceInput` from `../hooks/useVoiceInput`
- Remove the inline voice state (lines 393, 402-408), event handlers (lines 617-645), `handleMicPress` (lines 647-678), `handleStopRecording` (lines 699-706), `contractOverlay` (lines 608-615), and `waveformFrameCallback` (lines 601-605)
- Replace with:

```typescript
const {
  isListening,
  transcript: voiceTranscript,
  volumeLevel,
  waveformTime,
  recordingExpansion,
  startRecording,
  stopRecording,
} = useVoiceInput({
  onTranscriptChange: (text) => setInputValue(text),
});
```

- Update `handleMicPress` to call `isListening ? stopRecording() : startRecording()`
- Update `handleStopRecording` to call `stopRecording()`
- Keep `micPulse`, `micAnimStyle`, `recordingOverlayStyle`, `handleInputAreaLayout`, `inputAreaWidthSV` in ChatPanel (these are ChatPanel-specific UI concerns)
- Keep `WaveformBar` component in ChatPanel (it will also be used in VoiceInputScreen via copy or shared component — decide in Task 4)

**Step 3: Verify ChatPanel still works**

Build and test that the existing voice recording in ChatPanel functions identically:
- Tap mic → waveform appears → speak → text appears in input → stop → text stays

**Step 4: Commit**

```bash
git add apps/mobile/src/hooks/useVoiceInput.ts apps/mobile/src/components/ChatPanel.tsx
git commit -m "refactor: extract useVoiceInput hook from ChatPanel"
```

---

### Task 3: Add Navigation + Deep Link Handling

**Files:**
- Modify: `apps/mobile/src/navigation/types.ts`
- Modify: `apps/mobile/src/navigation/RootNavigator.tsx`

**Step 1: Update navigation types**

Add `VoiceInput` to `RootStackParamList` in `types.ts`:

```typescript
// Root stack (wraps everything)
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: undefined;
  VoiceInput: undefined;
};
```

**Step 2: Add deep link config and VoiceInput screen to RootNavigator**

In `RootNavigator.tsx`:

```typescript
import { Linking } from 'react-native';
import VoiceInputScreen from '../screens/VoiceInputScreen';

// Deep link configuration
const linking = {
  prefixes: ['slate://'],
  config: {
    screens: {
      VoiceInput: 'voice-input',
      Main: '',
    },
  },
};

// In the JSX — add linking prop and VoiceInput screen:
<NavigationContainer linking={linking} theme={...}>
  <Stack.Navigator ...>
    {!user ? (
      <Stack.Screen name="Auth" component={AuthNavigator} />
    ) : (
      <>
        <Stack.Screen name="Main" component={MainScreen} />
        <Stack.Screen
          name="VoiceInput"
          component={VoiceInputScreen}
          options={{
            animation: 'fade',
            presentation: 'fullScreenModal',
            gestureEnabled: false,
          }}
        />
      </>
    )}
  </Stack.Navigator>
</NavigationContainer>
```

Note: Use `<>...</>` fragment to wrap multiple screens in the conditional. The `VoiceInput` screen is only available when authenticated (inside the `user` branch).

**Step 3: Create placeholder VoiceInputScreen**

Create a minimal placeholder so navigation builds:

```typescript
// apps/mobile/src/screens/VoiceInputScreen.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../styles';

export default function VoiceInputScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Voice Input (placeholder)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  text: { color: colors.textPrimary, fontSize: 16 },
});
```

**Step 4: Test deep link**

Build the app. Test with:
```bash
xcrun simctl openurl booted "slate://voice-input"
```

Expected: App opens to the placeholder VoiceInputScreen.

**Step 5: Commit**

```bash
git add apps/mobile/src/navigation/types.ts apps/mobile/src/navigation/RootNavigator.tsx apps/mobile/src/screens/VoiceInputScreen.tsx
git commit -m "feat: add VoiceInput screen with deep link routing"
```

---

### Task 4: Build VoiceInputScreen — Recording State

**Files:**
- Modify: `apps/mobile/src/screens/VoiceInputScreen.tsx`

**Step 1: Implement the recording state UI**

Replace the placeholder with the full recording state. This is the initial screen the user sees — waveform centered, "LISTENING" label, stop button.

```typescript
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Linking as RNLinking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { Square, X, Mic, Trash2, Send } from 'lucide-react-native';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { useTheme } from '../contexts/ThemeContext';
import { colors as staticColors, theme } from '../styles';

// Waveform constants — larger than ChatPanel for hero display
const WAVEFORM_BAR_COUNT = 48;
const WAVEFORM_BAR_WIDTH = 3;
const WAVEFORM_BAR_GAP = 2;
const WAVEFORM_MAX_HEIGHT = 80;
const WAVEFORM_MIN_HEIGHT = 4;

type ScreenState = 'recording' | 'review' | 're-recording';

// WaveformBar — same algorithm as ChatPanel, scaled up
const WaveformBar = React.memo(({
  index,
  waveformTime,
  volumeLevel,
  accentColor,
  maxHeight,
}: {
  index: number;
  waveformTime: Animated.SharedValue<number>;
  volumeLevel: Animated.SharedValue<number>;
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
```

**Step 2: Build the main component with all three states**

```typescript
export default function VoiceInputScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const colors = useTheme();

  const [screenState, setScreenState] = useState<ScreenState>('recording');
  const [text, setText] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const textInputRef = useRef<TextInput>(null);

  const {
    isListening,
    transcript,
    volumeLevel,
    waveformTime,
    error,
    startRecording,
    stopRecording,
    resetTranscript,
  } = useVoiceInput({
    onTranscriptChange: (newText) => {
      if (screenState === 're-recording') {
        // Insert at cursor position
        setText(prev => {
          const before = prev.slice(0, cursorPosition);
          const after = prev.slice(cursorPosition);
          return before + newText + after;
        });
      } else {
        setText(newText);
      }
    },
  });

  // Auto-start recording on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      startRecording();
    }, 300); // brief delay for screen transition
    return () => clearTimeout(timer);
  }, []);

  const handleStop = useCallback(async () => {
    await stopRecording();
    setScreenState('review');
  }, [stopRecording]);

  const handleClear = useCallback(() => {
    setText('');
    resetTranscript();
    setScreenState('recording');
    startRecording();
  }, [resetTranscript, startRecording]);

  const handleReRecord = useCallback(async () => {
    // Save cursor position, start recording again
    setScreenState('re-recording');
    await startRecording();
  }, [startRecording]);

  const handleStopReRecord = useCallback(async () => {
    await stopRecording();
    setScreenState('review');
  }, [stopRecording]);

  const handleSend = useCallback(() => {
    if (!text.trim()) return;
    // Navigate back to Main and trigger chat with this text
    // TODO: Wire up to ChatPanel via navigation params or a store
    navigation.goBack();
  }, [text, navigation]);

  const handleClose = useCallback(() => {
    if (isListening) {
      stopRecording();
    }
    navigation.goBack();
  }, [isListening, stopRecording, navigation]);

  // Check mic permission
  if (error === 'Failed to start recording') {
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Text style={styles.errorTitle}>MICROPHONE ACCESS REQUIRED</Text>
        <Text style={styles.errorBody}>Enable microphone access in Settings to use voice input.</Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => RNLinking.openSettings()}
        >
          <Text style={styles.settingsButtonText}>OPEN SETTINGS</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.closeButtonAbsolute} onPress={handleClose}>
          <X size={20} color={staticColors.textMuted} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Close button — visible in review and re-recording states */}
      {screenState !== 'recording' && (
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <X size={20} color={staticColors.textMuted} />
        </TouchableOpacity>
      )}

      {/* State label */}
      <View style={styles.labelContainer}>
        <Text style={styles.stateLabel}>
          {screenState === 'recording' || screenState === 're-recording' ? 'LISTENING' : 'REVIEW'}
        </Text>
      </View>

      {/* Recording state: hero waveform + stop button */}
      {screenState === 'recording' && (
        <>
          <View style={styles.waveformHero}>
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
          <View style={styles.stopContainer}>
            <TouchableOpacity style={styles.stopButton} onPress={handleStop} activeOpacity={0.7}>
              <Square size={24} color={staticColors.textPrimary} fill={staticColors.textPrimary} />
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Review state: text input + action bar */}
      {screenState === 'review' && (
        <>
          <View style={styles.textContainer}>
            <TextInput
              ref={textInputRef}
              style={styles.textInput}
              value={text}
              onChangeText={setText}
              onSelectionChange={(e) => setCursorPosition(e.nativeEvent.selection.start)}
              multiline
              placeholder="Tap to edit..."
              placeholderTextColor={staticColors.textMuted}
              autoFocus={false}
            />
          </View>
          <View style={styles.actionBar}>
            <TouchableOpacity style={styles.actionButton} onPress={handleClear} activeOpacity={0.7}>
              <Trash2 size={20} color={staticColors.danger} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleReRecord} activeOpacity={0.7}>
              <Mic size={20} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.sendButton]}
              onPress={handleSend}
              activeOpacity={0.7}
            >
              <Send size={20} color={staticColors.textPrimary} />
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Re-recording state: smaller waveform + text below */}
      {screenState === 're-recording' && (
        <>
          <View style={styles.waveformSmall}>
            {Array.from({ length: WAVEFORM_BAR_COUNT }, (_, i) => (
              <WaveformBar
                key={i}
                index={i}
                waveformTime={waveformTime}
                volumeLevel={volumeLevel}
                accentColor={colors.primary}
                maxHeight={40}
              />
            ))}
          </View>
          <View style={styles.reRecordStopContainer}>
            <TouchableOpacity style={styles.stopButton} onPress={handleStopReRecord} activeOpacity={0.7}>
              <Square size={24} color={staticColors.textPrimary} fill={staticColors.textPrimary} />
            </TouchableOpacity>
          </View>
          <View style={styles.textContainerSmall}>
            <TextInput
              style={styles.textInput}
              value={text}
              onChangeText={setText}
              multiline
              editable={false}
              placeholderTextColor={staticColors.textMuted}
            />
          </View>
        </>
      )}
    </View>
  );
}
```

**Step 3: Add styles**

```typescript
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: staticColors.bg,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  closeButtonAbsolute: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  labelContainer: {
    paddingTop: 80,
    alignItems: 'center',
  },
  stateLabel: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 11,
    color: staticColors.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  waveformHero: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveformSmall: {
    height: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  stopContainer: {
    alignItems: 'center',
    paddingBottom: 80,
  },
  reRecordStopContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  stopButton: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: staticColors.border,
    borderRadius: 2,
  },
  textContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  textContainerSmall: {
    flex: 1,
    paddingHorizontal: 24,
  },
  textInput: {
    flex: 1,
    fontFamily: 'Manrope-Regular',
    fontSize: 16,
    color: staticColors.textPrimary,
    lineHeight: 24,
    textAlignVertical: 'top',
    padding: 0,
  },
  actionBar: {
    height: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
  },
  actionButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: staticColors.border,
    borderRadius: 2,
  },
  sendButton: {
    borderColor: '#948b72', // primary beige — will use colors.primary at runtime
  },
  errorTitle: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 11,
    color: staticColors.textMuted,
    letterSpacing: 1.5,
    textAlign: 'center',
    marginTop: 'auto',
  },
  errorBody: {
    fontFamily: 'Manrope-Regular',
    fontSize: 14,
    color: staticColors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 48,
    marginTop: 12,
  },
  settingsButton: {
    marginTop: 24,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: staticColors.border,
    borderRadius: 2,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 'auto',
  },
  settingsButtonText: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 11,
    color: staticColors.textPrimary,
    letterSpacing: 1.5,
  },
});
```

**Step 4: Test**

Build and run. Test with deep link:
```bash
xcrun simctl openurl booted "slate://voice-input"
```

Expected: Full-black screen, "LISTENING" label, waveform animates with voice, stop button visible.

**Step 5: Commit**

```bash
git add apps/mobile/src/screens/VoiceInputScreen.tsx
git commit -m "feat: build VoiceInputScreen with recording, review, and re-recording states"
```

---

### Task 5: Wire Send Action to ChatPanel

**Files:**
- Modify: `apps/mobile/src/screens/VoiceInputScreen.tsx`
- Modify: `apps/mobile/src/navigation/types.ts`
- Potentially modify: `apps/mobile/src/screens/MainScreen.tsx` or relevant store

This task connects the "Send" button to actually deliver the transcription to the AI chat. The exact wiring depends on how MainScreen/ChatPanel currently receives messages — investigate first.

**Step 1: Investigate how ChatPanel receives messages**

Read `MainScreen.tsx` to understand how ChatPanel is rendered and how `onSendMessage` is wired. Determine the best approach:
- **Option A:** Pass a navigation param `{ voiceMessage: string }` to Main screen, MainScreen reads it and auto-sends
- **Option B:** Use a Zustand store action (e.g., `useChatState.getState().queueMessage(text)`)

**Step 2: Implement the chosen approach**

If Option A: Update `RootStackParamList` to `Main: { voiceMessage?: string } | undefined`, pass the param in `handleSend`, read it in MainScreen with `useRoute()`.

If Option B: Call the store action directly in `handleSend` before `navigation.goBack()`.

**Step 3: Ensure ChatPanel opens after navigation**

The ChatPanel may need to auto-expand when a voice message arrives. Check if there's an existing mechanism (e.g., a `chatPanelOpen` state or `setExpanded` function).

**Step 4: Test end-to-end**

1. Deep link → Recording → Speak → Stop → Review text → Send
2. Verify: navigates to main, ChatPanel opens, message submitted, AI response streams

**Step 5: Commit**

```bash
git add -A  # (specific files based on what was modified)
git commit -m "feat: wire VoiceInputScreen send to ChatPanel"
```

---

### Task 6: Build Native ControlWidget Extension (Swift)

**Files:**
- Create: `apps/mobile/ios/SlateControl/SlateControlWidget.swift`
- Create: `apps/mobile/ios/SlateControl/StartVoiceInputIntent.swift`
- Create: `apps/mobile/ios/SlateControl/Info.plist`
- Modify: `apps/mobile/ios/SlateApp.xcodeproj/project.pbxproj` (via Xcode)

**Step 1: Create the widget extension directory**

```bash
mkdir -p apps/mobile/ios/SlateControl
```

**Step 2: Create StartVoiceInputIntent.swift**

```swift
// apps/mobile/ios/SlateControl/StartVoiceInputIntent.swift
import AppIntents

@available(iOS 18.0, *)
struct StartVoiceInputIntent: AppIntent {
    static var title: LocalizedStringResource = "Start Voice Input"
    static var description = IntentDescription("Open Slate and start voice input")
    static var openAppWhenRun: Bool = true

    func perform() async throws -> some IntentResult {
        // Open the app via URL scheme
        // The system handles opening the app because openAppWhenRun = true
        // We pass the deep link via environment or UserDefaults
        let url = URL(string: "slate://voice-input")!

        // Use shared UserDefaults to signal the deep link
        // (openAppWhenRun opens the app but doesn't pass a URL directly)
        UserDefaults.standard.set("voice-input", forKey: "pendingDeepLink")

        return .result()
    }
}
```

Note: The `openAppWhenRun = true` opens the app, and the URL scheme is handled via `UIApplication.open()` or by checking UserDefaults on launch. The exact mechanism may need adjustment — test on device.

**Alternative approach:** If `openAppWhenRun` doesn't pass the URL, use `EnvironmentValues.openURL`:

```swift
import AppIntents
import SwiftUI

@available(iOS 18.0, *)
struct StartVoiceInputIntent: AppIntent {
    static var title: LocalizedStringResource = "Start Voice Input"
    static var description = IntentDescription("Open Slate and start voice input")
    static var openAppWhenRun: Bool = true

    @Dependency
    private var openURL: OpenURLIntent

    func perform() async throws -> some IntentResult {
        return .result()
    }
}
```

With `openAppWhenRun = true`, the app opens. Then in `AppDelegate.mm`, handle the `slate://voice-input` URL from `application:openURL:options:`. Since the ControlWidget press opens the app, we need the URL scheme registered (done in Task 1) and the `AppDelegate` to forward the URL to React Native's Linking system (which React Native does by default).

**The simplest approach:** Set `openAppWhenRun = true` and configure the ControlWidget's `AppIntent` to call `openURL` with `slate://voice-input`. Research the exact iOS 18 API for this during implementation.

**Step 3: Create SlateControlWidget.swift**

```swift
// apps/mobile/ios/SlateControl/SlateControlWidget.swift
import WidgetKit
import SwiftUI
import AppIntents

@available(iOS 18.0, *)
struct SlateVoiceControl: ControlWidget {
    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(kind: "co.opsapp.slate.voiceinput") {
            ControlWidgetButton(action: StartVoiceInputIntent()) {
                Label("Voice Input", systemImage: "mic.fill")
            }
        }
        .displayName("Slate Voice")
        .description("Start voice input in Slate")
    }
}
```

**Step 4: Create Info.plist for the extension**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDisplayName</key>
    <string>SlateControl</string>
    <key>CFBundleExecutable</key>
    <string>$(EXECUTABLE_NAME)</string>
    <key>CFBundleIdentifier</key>
    <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>$(PRODUCT_NAME)</string>
    <key>CFBundlePackageType</key>
    <string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>NSExtension</key>
    <dict>
        <key>NSExtensionPointIdentifier</key>
        <string>com.apple.widgetkit-extension</string>
    </dict>
</dict>
</plist>
```

**Step 5: Add widget extension target in Xcode**

This must be done in Xcode (not CLI):
1. Open `SlateApp.xcworkspace`
2. File → New → Target → Widget Extension
3. Name: `SlateControl`
4. Bundle ID: `co.opsapp.slate.control`
5. Uncheck "Include Live Activity" and "Include Configuration App Intent"
6. Replace generated code with the files created above
7. Set deployment target to iOS 18.0
8. Build and verify no errors

**Step 6: Test on device**

ControlWidgets require a physical device with iOS 18+. On device:
1. Build and install
2. Settings → Action Button → Controls → look for "Slate Voice"
3. Assign it
4. Press Action Button → app opens → VoiceInputScreen appears

**Step 7: Commit**

```bash
git add apps/mobile/ios/SlateControl/ apps/mobile/ios/SlateApp.xcodeproj/
git commit -m "feat: add ControlWidget extension for Action Button voice input"
```

---

### Task 7: End-to-End Testing & Polish

**Files:**
- Potentially modify any of the above files for bug fixes

**Step 1: Test the full flow**

1. Action Button → App opens → VoiceInputScreen (recording)
2. Speak → Waveform animates
3. Tap stop → Review state with transcription
4. Edit text → Verify cursor works
5. Tap mic → Re-recording state, waveform top, text bottom
6. Tap stop → Back to review with inserted text
7. Tap send → Navigate to main, ChatPanel receives message
8. Tap clear → Returns to recording state
9. Tap X → Dismisses to main (no message sent)

**Step 2: Test edge cases**

- Cold start via deep link (app not running)
- Foreground via deep link (app already open)
- Mic permission denied
- No speech detected (empty transcript)
- Very long transcription (scrolling)

**Step 3: Polish**

- Verify all animations use Slate timing values (150/200/250ms)
- Verify all colors come from design tokens
- Verify sharp corners (2px max)
- Verify Manrope font usage throughout

**Step 4: Final commit**

```bash
git add -A
git commit -m "polish: end-to-end testing and UI refinements for voice input"
```
