# Action Button Voice Input Design

## Summary

iPhone Action Button (iOS 18+) triggers a dedicated voice recording screen in Slate. User speaks, reviews/edits the transcription, and sends it to AI chat.

## Architecture

### Native Layer — ControlWidget (Swift)

New Xcode target: `SlateControl` (Widget Extension)

- `SlateControlWidget.swift` — ControlWidget with mic button labeled "Slate Voice"
- `StartVoiceInputIntent.swift` — AppIntent with `openAppWhenRun = true`, opens `slate://voice-input`
- Bundle ID: `co.opsapp.slate.control`
- ~50-80 lines of Swift total
- No App Group or shared data needed — just opens the app

**User setup (one-time):** Settings → Action Button → Controls → "Slate Voice"

### React Native Layer — Deep Link + Voice Screen

**Deep link handling:**
- Cold start: `Linking.getInitialURL()` catches `slate://voice-input`
- Foreground: `Linking.addEventListener` catches the link
- Routes to new `VoiceInputScreen`

**Shared voice hook — `useVoiceInput()`:**
- Extracted from ChatPanel.tsx voice logic
- Exposes: `startRecording()`, `stopRecording()`, `transcript`, `isRecording`, `volume`, `error`
- Both ChatPanel and VoiceInputScreen consume this hook

## Voice Input Screen Design

### State 1: Recording

Full-black screen. The waveform is the hero element.

**Layout (top to bottom):**
- Safe area top padding
- "LISTENING" label — Manrope SemiBold, 11px, textMuted (#525252), letter-spacing 1.5px, uppercase. Centered. Top third of screen.
- Waveform — centered vertically. 48 bars (double ChatPanel's 24 for more visual presence). Bar width: 3px, gap: 2px, max height: 80px (2.5x ChatPanel's 32px). Color: primary beige (#948b72). Min height: 4px.
- Stop button — bottom third, centered. 64x64px. Border: 1px solid rgba(255,255,255,0.1). Border-radius: 2px. Contains 24px filled square icon in textPrimary (#e8e8e8). Touch target: 80x80px.
- Safe area bottom padding

**Animations:**
- Waveform bars: same algorithm as ChatPanel (volume + sin wave with phase offset), scaled up
- Mic pulse: none on this screen (stop button is static, waveform IS the pulse)
- Recording starts automatically on screen mount

### State 2: Review & Edit

Waveform collapses (250ms, Easing.out). Transcription text rises into view.

**Layout (top to bottom):**
- Safe area top padding
- Close button (X) — top-left, 44x44px touch target, 20px X icon, textMuted color
- "REVIEW" label — same style as "LISTENING" label. Centered.
- TextInput — multi-line, scrollable. Manrope Regular, 16px, textPrimary (#e8e8e8), lineHeight 24px. Placeholder: "Tap to edit..." in textMuted. No border. Background: transparent. Flex: 1 to fill available space. Padding: 24px horizontal.
- Action bar — bottom, above safe area. Height: 72px. Flex-row, justify: space-between, padding: 16px horizontal.
  - Clear button — 44x44px. Trash icon (20px) in danger color (#b83c2a). Border: 1px solid rgba(255,255,255,0.1). Border-radius: 2px.
  - Mic button — 44x44px. Mic icon (20px) in primary beige (#948b72). Border: 1px solid rgba(255,255,255,0.1). Border-radius: 2px. Resumes recording, inserts at cursor.
  - Send button — 44x44px. Send icon (20px) in textPrimary (#e8e8e8). Border: 1px solid primary beige (#948b72). Border-radius: 2px.
- Safe area bottom padding

**Cursor-position insertion:**
- When mic button tapped in review state, capture TextInput selection position
- New speech is spliced into existing text at cursor location
- Returns to recording state (waveform visible above the text input, both visible)

### State 3: Re-recording (from review)

Text input remains visible at bottom half. Waveform appears in top half (smaller, 40px max height). Stop button between them.

When stopped, new transcription is inserted at the saved cursor position.

## After Send

Navigate to the screen containing ChatPanel. Open ChatPanel. Submit the transcription as a user message. User sees AI response streaming in.

## Edge Cases

- **Mic permission denied:** Show centered message with "Microphone access required" and a button to open Settings
- **No speech detected:** When stop is tapped with empty transcript, show the Review state with empty TextInput (user can type manually)
- **App killed during recording:** No state to recover — user re-triggers from Action Button
- **Clear button:** Returns to Recording state (fresh start)
- **Back gesture / X button:** Dismisses screen without sending, returns to wherever user was

## Token Alignment

All values pull from existing Slate design tokens:
- Colors: bg, surface, border, primary, textPrimary, textSecondary, textMuted, danger
- Spacing: 4px base unit, using 4/8/16/24 multiples
- Border-radius: 2px for interactive elements
- Typography: Manrope family, established size scale
- Animation: 150ms (fast), 200ms (normal), 250ms (slow)
- Depth: No shadows, surface elevation through lightness shifts only

## Files to Create/Modify

### New files:
- `ios/SlateControl/` — Widget extension target (Swift)
  - `SlateControlWidget.swift`
  - `StartVoiceInputIntent.swift`
  - `Info.plist`
- `src/screens/VoiceInputScreen.tsx` — Dedicated voice screen
- `src/hooks/useVoiceInput.ts` — Shared voice recording hook

### Modified files:
- `ios/SlateApp.xcodeproj` — Add widget extension target
- `src/components/ChatPanel.tsx` — Extract voice logic to shared hook
- Navigation config — Add VoiceInputScreen route + deep link handler
- `ios/SlateApp/Info.plist` — Ensure `slate://` URL scheme is registered
