# Backlog Bugs & Features Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 4 critical bugs (data persistence, rename, voice input, agent data loss) and implement 12 features across web and mobile.

**Architecture:** React web app (`apps/web`) + React Native mobile (`apps/mobile`), Supabase backend, OpenAI agent via `/api/agent.js`. `MainApp.jsx` is the primary component (~3500 lines). Chrome extension items excluded.

**Tech Stack:** React/Vite (web), React Native 0.73 (mobile), Supabase, Zustand, react-router-dom v7, lucide-react

---

## SECTION 1: CRITICAL BUGS

### Task 1: Fix page/section create/delete/rename not persisting until reload

**Root cause:** `MainApp.jsx` has dual state: `pages` (used by `saveAll` effect) and `ownedPages` (used to compute `allPages` for sidebar rendering). Most mutations update `pages` but NOT `ownedPages`, so sidebar stays stale.

**Files:**
- Modify: `apps/web/src/screens/MainApp.jsx`

**Step 1: Add `mutateOwnedPages` helper**

After line ~414 (where `allPages` is computed), add:

```js
const mutateOwnedPages = (transform) => {
  setPages(prev => transform(prev));
  setOwnedPages(prev => transform(prev));
};
```

**Step 2: Replace bare `setPages` calls for owned-page mutations**

Every `setPages(...)` that mutates page structure needs to become `mutateOwnedPages(...)`. Key locations:

- ~L384: keyboard shortcut page create
- ~L395: keyboard shortcut section create
- ~L784,800: `handleCreateConfirm` page/section
- ~L1475: inline page rename onChange
- ~L1573: inline section rename onChange
- ~L3253,3267: sidebar page/section create
- ~L3310: star toggle
- ~L3322: context menu "Add section"
- ~L3362: delete page (also remove redundant `setOwnedPages` on L3363)
- ~L3409: copy section
- ~L3437: delete section

Each `setPages(pages.map/filter(...))` becomes `mutateOwnedPages(prev => prev.map/filter(...))`.

**Step 3: Verify and commit**

Test: create page via `p` shortcut, rename inline, delete section via context menu. All should reflect immediately in sidebar and persist on reload.

```bash
git add apps/web/src/screens/MainApp.jsx
git commit -m "fix: sync ownedPages with pages mutations for immediate sidebar updates"
```

---

### Task 2: Fix agent data loss — notes deleted/overwritten after agent operations

**Root cause:** `saveAll` effect fires on every `notes` state change. It runs `setNotes()` in storage which does FULL sync (deletes DB notes not in local array). When agent writes to DB directly and `refreshData()` is async, `saveAll` can fire with stale local state — deleting what the agent just created.

**Files:**
- Modify: `apps/web/src/screens/MainApp.jsx`

**Step 1: Add agent-operation lock ref**

Near other refs (~L227):

```js
const agentSaveLock = useRef(false);
```

**Step 2: Gate the saveAll effect**

Change effect at ~L323-328:

```js
useEffect(() => {
  if (!loading && !agentSaveLock.current) {
    dataStore.saveAll({ pages, tags, notes, boxConfigs });
  }
}, [pages, tags, notes, boxConfigs, loading]);
```

**Step 3: Lock around agent calls**

In `handleChatMessage` (~L1005):

```js
const handleChatMessage = async (message, confirmedValue = null) => {
  chatState.setProcessing(true);
  agentSaveLock.current = true;
  if (!confirmedValue) chatState.addUserMessage(message);
  try {
    const result = await callAgent(...);
    // ... existing response handling ...
    await refreshData();
  } catch (err) {
    // ... existing error handling ...
  } finally {
    agentSaveLock.current = false;
    chatState.setProcessing(false);
  }
};
```

Also lock in `handleExecutePlan` (~L819) with same pattern.

**Step 4: Commit**

```bash
git add apps/web/src/screens/MainApp.jsx
git commit -m "fix: prevent saveAll from overwriting agent DB changes during async refresh"
```

---

### Task 3: Fix voice/microphone button — stale closure causes stuck recording state

**Root cause:** `VoiceInput.jsx` `recognition.onend` callback closes over `isRecording` from init time (always `false`). When browser auto-stops recognition, `stopRecording()` is never called. UI stays stuck in recording mode.

**Files:**
- Modify: `apps/web/src/components/VoiceInput.jsx`

**Step 1: Add isRecording ref**

After line 21:
```js
const isRecordingRef = useRef(false);
```

**Step 2: Sync ref in start/stop**

In `startRecording` after `setIsRecording(true)`:
```js
isRecordingRef.current = true;
```

In `stopRecording` at top:
```js
if (!isRecordingRef.current) return;
isRecordingRef.current = false;
```

**Step 3: Fix onend handler**

```js
recognition.onend = () => {
  if (isRecordingRef.current) {
    stopRecording();
  }
};
```

**Step 4: Commit**

```bash
git add apps/web/src/components/VoiceInput.jsx
git commit -m "fix: use ref to fix stale closure in voice recognition onend handler"
```

---

### Task 4: Fix inline rename (verified by Task 1)

After Task 1's `mutateOwnedPages` is applied, inline rename onChange handlers automatically update both `pages` and `ownedPages`. Verify:

1. Right-click page > Rename > type > Enter > reload > name persists
2. Header pencil icon > type > Enter > reload > name persists
3. Right-click section > Rename > same

```bash
git commit -m "fix: inline rename persists via mutateOwnedPages (verified)"
```

---

## SECTION 2: URL PERSISTENCE

### Task 5: Store page/section in URL path

**Files:**
- Modify: `apps/web/src/App.jsx`
- Modify: `apps/web/src/screens/MainApp.jsx`

**Step 1: Add routes in App.jsx**

```jsx
<Routes>
  <Route path="/public/:token" element={<PublicPage />} />
  <Route path="/p/:pageId/s/:sectionId" element={<Slate />} />
  <Route path="/p/:pageId" element={<Slate />} />
  <Route path="/*" element={<Slate />} />
</Routes>
```

**Step 2: Read URL params in MainApp**

```js
import { useParams, useNavigate } from 'react-router-dom';
const { pageId: urlPageId, sectionId: urlSectionId } = useParams();
const navigate = useNavigate();
```

**Step 3: Restore from URL on load**

In load useEffect, after setting defaults, check URL params:

```js
if (urlPageId) {
  const target = allPages.find(p => p.id === urlPageId);
  if (target) {
    setCurrentPage(urlPageId);
    if (urlSectionId) { setCurrentSection(urlSectionId); setViewingPageLevel(false); }
    else setViewingPageLevel(true);
  }
}
```

**Step 4: Update URL on navigation**

```js
useEffect(() => {
  if (!currentPage) return;
  const path = currentSection ? `/p/${currentPage}/s/${currentSection}` : `/p/${currentPage}`;
  navigate(path, { replace: true });
}, [currentPage, currentSection]);
```

**Step 5: Commit**

```bash
git add apps/web/src/App.jsx apps/web/src/screens/MainApp.jsx
git commit -m "feat: persist page/section in URL for reload restoration"
```

---

## SECTION 3: CHAT INPUT UX

### Task 6: Autofill suggestions — "-" shows pages, "-page/" shows sections

**Files:**
- Modify: `apps/web/src/components/ChatPanel.jsx`
- Modify: `apps/web/src/screens/MainApp.jsx` (pass `pages` prop)

**Step 1: Pass pages to ChatPanel**

In MainApp where `<ChatPanel` is rendered, add `pages={allPages}`.

**Step 2: Add autofill state in ChatPanel**

```js
const [suggestions, setSuggestions] = useState([]);
const [suggestionIndex, setSuggestionIndex] = useState(0);
const [suggestionPrefix, setSuggestionPrefix] = useState('');
```

**Step 3: Compute suggestions on input change**

```js
useEffect(() => {
  const val = inputValue;
  const sectionMatch = val.match(/^-([^/]+)\/(.*)$/);
  if (sectionMatch) {
    const page = pages.find(p => p.name.toLowerCase() === sectionMatch[1].trim().toLowerCase());
    if (page) {
      const partial = sectionMatch[2].toLowerCase();
      setSuggestions(page.sections.map(s => s.name).filter(n => n.toLowerCase().startsWith(partial)));
      setSuggestionPrefix(`-${sectionMatch[1]}/`);
      setSuggestionIndex(0);
      return;
    }
  }
  const pageMatch = val.match(/^-([^/]*)$/);
  if (pageMatch) {
    const partial = pageMatch[1].toLowerCase();
    setSuggestions(pages.map(p => p.name).filter(n => n.toLowerCase().startsWith(partial)));
    setSuggestionPrefix('-');
    setSuggestionIndex(0);
    return;
  }
  setSuggestions([]);
}, [inputValue, pages]);
```

**Step 4: Render dropdown**

Translucent dropdown above input with suggestions. Selected item highlighted.

**Step 5: Tab to accept**

In handleKeyDown:
```js
if (e.key === 'Tab' && suggestions.length > 0) {
  e.preventDefault();
  const s = suggestions[suggestionIndex];
  const isSectionMode = suggestionPrefix.includes('/');
  setInputValue(isSectionMode ? `${suggestionPrefix}${s}: ` : `-${s}/`);
  setSuggestions([]);
}
```

Also handle ArrowUp/Down for cycling suggestions.

**Step 6: Commit**

```bash
git add apps/web/src/components/ChatPanel.jsx apps/web/src/screens/MainApp.jsx
git commit -m "feat: autofill page/section suggestions when typing - prefix in chat"
```

---

### Task 7: ESC behaviors — single cancels action, double clears input

**Files:**
- Modify: `apps/web/src/components/ChatPanel.jsx`

```js
const lastEscTime = useRef(0);

// In handleKeyDown:
if (e.key === 'Escape') {
  const now = Date.now();
  if (now - lastEscTime.current < 400) {
    setInputValue('');
    setSuggestions([]);
    lastEscTime.current = 0;
  } else {
    lastEscTime.current = now;
    if (suggestions.length > 0) setSuggestions([]);
  }
}
```

```bash
git commit -m "feat: double-ESC clears chat input, single-ESC dismisses suggestions"
```

---

### Task 8: Shift+Up arrow — prefill with last page/section prefix

**Files:**
- Modify: `apps/web/src/components/ChatPanel.jsx`

```js
const lastPrefix = useRef('');
const [prefixShimmer, setPrefixShimmer] = useState(false);

// In handleSubmit, capture prefix before sending:
const match = inputValue.match(/^-?([^:]+):/);
if (match) lastPrefix.current = match[0] + ' ';

// In handleKeyDown:
if (e.key === 'ArrowUp' && e.shiftKey) {
  e.preventDefault();
  if (lastPrefix.current) {
    setInputValue(lastPrefix.current);
    setPrefixShimmer(true);
    setTimeout(() => setPrefixShimmer(false), 600);
  }
}
```

Apply subtle background flash on shimmer state.

```bash
git commit -m "feat: shift+up prefills chat with last used page/section prefix"
```

---

### Task 9: Drag note into chat to reference it

**Files:**
- Modify: `apps/web/src/components/NoteCard.jsx` (add `draggable`, `onDragStart`)
- Modify: `apps/web/src/components/ChatPanel.jsx` (add drop target)

NoteCard:
```jsx
draggable
onDragStart={(e) => {
  e.dataTransfer.setData('noteId', note.id);
  e.dataTransfer.setData('notePreview', (note.content || '').substring(0, 12));
}}
```

ChatPanel input area:
```js
onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
onDragLeave={() => setIsDragOver(false)}
onDrop={(e) => {
  e.preventDefault(); setIsDragOver(false);
  const preview = e.dataTransfer.getData('notePreview');
  if (preview) {
    setInputValue(prev => `@[${preview}...] ` + prev);
    // trigger shimmer animation
  }
}}
```

```bash
git commit -m "feat: drag note into chat input to create reference with shimmer"
```

---

## SECTION 4: NOTE & TAG UI

### Task 10: Add "+" icon next to note tags for manual tag entry

**Files:**
- Modify: `apps/web/src/components/NoteCard.jsx`
- Modify: `apps/web/src/screens/MainApp.jsx` (pass `onTagAdd` callback)

Add local state in NoteCard for inline tag input. Show `+` button after tag pills. On click, show mini input. On Enter, call `onTagAdd(noteId, tagName)`. Parent updates notes state.

```bash
git commit -m "feat: add + button next to tags for manual tag entry on notes"
```

---

### Task 11: Completed notes below collapsible separator (collapsed by default)

**Files:**
- Modify: `apps/web/src/screens/MainApp.jsx`

Split `filteredNotes` into `activeNotes` and `completedNotes`. Render active notes first, then a clickable separator showing count, then completed notes (only when expanded).

```js
const [completedExpanded, setCompletedExpanded] = useState(false);
const activeNotes = filteredNotes.filter(n => !n.completed);
const completedNotes = filteredNotes.filter(n => n.completed);
```

```bash
git commit -m "feat: completed notes in collapsible section, collapsed by default"
```

---

### Task 12: "Complete All" button in header bar

**Files:**
- Modify: `apps/web/src/screens/MainApp.jsx`

Add button near view mode toggles in section header. On click, mark all `activeNotes` as completed.

```bash
git commit -m "feat: complete-all button in section header"
```

---

## SECTION 5: VIEW & NAVIGATION

### Task 13: Swipe right from right edge to cycle view modes (mobile)

**Files:**
- Modify: `apps/web/src/screens/MainApp.jsx`

```js
const VIEW_MODES = ['list', 'boxes', 'calendar'];
const touchStartX = useRef(null);
const touchStartY = useRef(null);
```

Add `onTouchStart`/`onTouchEnd` to main content div. Detect right-swipe starting from right 30% of screen, horizontal enough (dx > 60, dy < 80). Cycle `viewMode`.

```bash
git commit -m "feat: swipe right from edge to cycle view modes on mobile"
```

---

## SECTION 6: AGENT FEATURES

### Task 14: Agent asks if note was cut off before posting

**Files:**
- Modify: `api/agent.js` (system prompt, ~L75-190)

Add to system prompt:
```
## Note Completeness Check
Before creating a note, check if input appears truncated (ends mid-sentence, mid-word, with " -", or lacks punctuation after 3+ words). If so, call ask_clarification: "It looks like your note may have been cut off. Should I add it as-is, or did you want to send more?"
Do NOT ask for short notes (<6 words) or naturally ending notes.
```

```bash
git commit -m "feat: agent checks for truncated notes before creating"
```

---

### Task 15: Upload project knowledge/context for agent

**Files:**
- Create: `apps/web/src/lib/projectContext.js`
- Modify: `apps/web/src/components/SettingsModal.jsx`
- Modify: `apps/web/src/screens/MainApp.jsx`
- Modify: `api/agent.js`

Store text in Supabase `user_settings` table (key: `project_context`). Add textarea in Settings. Load on mount, pass to `callAgent`. Inject into system prompt (truncated to 2000 chars).

```bash
git commit -m "feat: project context upload for agent categorization"
```

---

## SECTION 7: iOS APP

### Task 16: Default API key for App Store submission

**Files:**
- Modify: `apps/mobile/src/services/api.ts`

Add fallback constant. Actual key substituted at build time, never committed.

```bash
git commit -m "feat: default API key placeholder for App Store submission"
```

---

## Excluded Items

- **Chrome extension** (login, ultrathinmaterial, styling) — excluded per user request
- **Case sensitivity** — already implemented (`.ilike()` + `.toLowerCase()`)
- **Duplicate URL item** — handled once in Task 5
