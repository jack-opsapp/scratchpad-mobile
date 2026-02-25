import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, FlatList, SectionList, StyleSheet, BackHandler, RefreshControl, Text, Pressable, Vibration, Dimensions, Alert, LayoutAnimation, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type { RootStackParamList } from '../navigation/types';
import { useSharedValue, runOnJS } from 'react-native-reanimated';
import { MobileHeader, MobileSidebar, NoteCard, ChatPanel, MoveOverlay, SettingsDrawer, PageContextMenu, ShareSheet, SharedPageBanner, HomeView } from '../components';
import type { DropTarget } from '../components';
import type { NoteDensity } from '../components/NoteCard';
import { useDataStore } from '../stores/dataStore';
import { useAuthStore } from '../stores/authStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useCalendarStore } from '../stores/calendarStore';
import DateTimePicker from '../components/DateTimePicker';
import { useChatState } from '../hooks/useChatState';
import { apiClient } from '../services/api';
import { colors as staticColors, theme } from '../styles';
import { useTheme } from '../contexts/ThemeContext';
import type { Note, AgentResponse, FrontendAction, PlanAction, CustomViewGroup } from '@slate/shared';
import { Layers } from 'lucide-react-native';
import { supabase } from '../services/supabase';
import type { PlanGroupStatus } from '../hooks/useChatState';

const ZOOM_LEVELS: NoteDensity[] = ['compact', 'default', 'comfortable', 'expanded'];

const EDGE_WIDTH = 20;

export default function MainScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<RootStackParamList, 'Main'>>();
  const { pages, sharedPages, notes: allNotes, userProfiles, customViews, loading, fetchData, refreshData, getNotesForSection, moveNote, updateNote, removeNote, updatePage, acceptSharedPage, declineSharedPage, addCustomView, removeCustomView } = useDataStore();
  const { user } = useAuthStore();
  const { settings } = useSettingsStore();
  const chatState = useChatState();
  const colors = useTheme();
  const { syncNote, unsyncNote } = useCalendarStore();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [currentPageId, setCurrentPageId] = useState<string | null>(null);
  const [currentSectionId, setCurrentSectionId] = useState<string | null>(null);
  const [awaitingResponse, setAwaitingResponse] = useState<{
    type: 'clarification' | 'confirmation';
    data: AgentResponse;
  } | null>(null);

  // DateTimePicker state
  const [datePickerNote, setDatePickerNote] = useState<Note | null>(null);

  // Drag-to-move state
  const [draggingNoteId, setDraggingNoteId] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const dropTargetsRef = useRef<DropTarget[]>([]);

  const draggingNote = draggingNoteId
    ? allNotes.find((n) => n.id === draggingNoteId) ?? null
    : null;

  // Zoom level: 0=compact, 1=default, 2=comfortable (default), 3=expanded
  const [zoomIndex, setZoomIndex] = useState(2);
  const zoomIndexRef = useRef(2);
  const density: NoteDensity = ZOOM_LEVELS[zoomIndex];

  // Home view zoom: 0=2col, 1=1col, 2=1col+3 notes, 3=1col+6 notes
  const [homeZoomIndex, setHomeZoomIndex] = useState(0);
  const homeZoomIndexRef = useRef(0);

  // Sort state
  type SortMode = 'created_desc' | 'created_asc' | 'alpha' | 'completed_last';
  const [sortMode, setSortMode] = useState<SortMode>(
    (settings.note_sort_order as SortMode) || 'created_desc'
  );
  const [customSortOrder, setCustomSortOrder] = useState<string[] | null>(null);

  // Custom view state
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [showViewDropdown, setShowViewDropdown] = useState(false);

  // Default page — apply once on first data load
  const hasAppliedDefault = useRef(false);

  // Pinch gesture — threshold-based level changes during pinch, no visual zoom
  const pinchBaseScale = useSharedValue(1);

  const handlePinchLevelChange = useCallback((direction: number) => {
    if (!currentPageId) {
      // Home view: cycle zoom levels 0-3
      const newIdx = Math.max(0, Math.min(3, homeZoomIndexRef.current + direction));
      if (newIdx !== homeZoomIndexRef.current) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        homeZoomIndexRef.current = newIdx;
        setHomeZoomIndex(newIdx);
      }
    } else {
      // Page view: change note density 0-3
      const newIdx = Math.max(0, Math.min(3, zoomIndexRef.current + direction));
      if (newIdx !== zoomIndexRef.current) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        zoomIndexRef.current = newIdx;
        setZoomIndex(newIdx);
      }
    }
  }, [currentPageId]);

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      pinchBaseScale.value = 1;
    })
    .onUpdate((event) => {
      const relative = event.scale / pinchBaseScale.value;
      if (relative > 1.4) {
        // Spread fingers past threshold → expand one level
        pinchBaseScale.value = event.scale;
        runOnJS(handlePinchLevelChange)(1);
      } else if (relative < 0.7) {
        // Pinch fingers past threshold → contract one level
        pinchBaseScale.value = event.scale;
        runOnJS(handlePinchLevelChange)(-1);
      }
    });

  useEffect(() => {
    fetchData();
  }, []);

  // Show welcome dialog when demo completes (called directly from ChatPanel)
  const handleDemoComplete = useCallback(() => {
    if (!settings.custom_openai_key) {
      setTimeout(() => {
        Alert.alert(
          'Welcome to Slate',
          'To get started, enter your OpenAI API key in the chat box below.',
          [{ text: 'OK' }],
        );
      }, 500);
    }
  }, [settings.custom_openai_key]);

  // Apply default page on first data load
  useEffect(() => {
    if (hasAppliedDefault.current) return;
    if (pages.length === 0 && sharedPages.length === 0) return;
    const defaultPageId = settings.default_page_id;
    if (!defaultPageId) {
      hasAppliedDefault.current = true;
      return;
    }
    const allPages = [...pages, ...sharedPages];
    const match = allPages.find((p) => p.id === defaultPageId);
    if (match) {
      setCurrentPageId(defaultPageId);
      if (settings.default_section_id) {
        const sectionMatch = match.sections.find((s) => s.id === settings.default_section_id);
        if (sectionMatch) setCurrentSectionId(settings.default_section_id);
      }
    }
    hasAppliedDefault.current = true;
  }, [pages, sharedPages, settings.default_page_id, settings.default_section_id]);

  // Handle back button on Android
  useEffect(() => {
    const handleBackPress = () => {
      if (shareOpen) {
        setShareOpen(false);
        return true;
      }
      if (sidebarOpen) {
        setSidebarOpen(false);
        return true;
      }
      if (currentSectionId) {
        setCurrentSectionId(null);
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => subscription.remove();
  }, [sidebarOpen, currentSectionId, shareOpen]);

  // Edge swipe to open sidebar
  const edgeSwipeGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.x <= EDGE_WIDTH && event.translationX > 50 && !sidebarOpen) {
        setSidebarOpen(true);
      }
    })
    .minDistance(10);

  const handleNavigate = useCallback((pageId: string | null, sectionId: string | null) => {
    setCurrentPageId(pageId);
    setCurrentSectionId(sectionId);
    setCustomSortOrder(null);
  }, []);

  const handleBackPress = useCallback(() => {
    if (currentSectionId) {
      setCurrentSectionId(null);
    }
  }, [currentSectionId]);

  // Get current page and section data
  const currentPage = pages.find((p) => p.id === currentPageId)
    || sharedPages.find((p) => p.id === currentPageId);
  const currentSharedPage = sharedPages.find((p) => p.id === currentPageId);
  const isPendingShare = currentSharedPage?.permissionStatus === 'pending';
  const currentSection = currentSectionId
    ? currentPage?.sections.find((s) => s.id === currentSectionId)
    : null;

  // Execute frontend actions from agent response
  const executeFrontendActions = useCallback((actions: FrontendAction[]) => {
    for (const action of actions) {
      switch (action.function) {
        case 'navigate': {
          const targetPage = pages.find(p => p.name === action.page_name);
          if (targetPage) {
            setCurrentPageId(targetPage.id);
            if (action.section_name) {
              const targetSection = targetPage.sections.find(
                s => s.name === action.section_name,
              );
              setCurrentSectionId(targetSection?.id || null);
            } else {
              setCurrentSectionId(null);
            }
          }
          break;
        }
        case 'clear_filters':
          // Reset to default view
          break;
        case 'sort_notes': {
          const noteIds = (action as unknown as { note_ids: string[] }).note_ids;
          if (noteIds && Array.isArray(noteIds)) {
            setCustomSortOrder(noteIds);
          }
          break;
        }
        case 'create_custom_view': {
          if (!action.title || !action.groups?.length) break;
          const targetPage = action.page_name
            ? pages.find(p => p.name === action.page_name)
            : currentPage;
          const pageId = targetPage?.id || null;
          let sectionId: string | null = null;
          if (action.section_name && targetPage) {
            const sec = targetPage.sections.find(s => s.name === action.section_name);
            sectionId = sec?.id || null;
          }
          if (!user) break;
          addCustomView({
            user_id: user.id,
            title: action.title,
            view_type: action.view_type || 'list',
            page_id: pageId,
            section_id: sectionId,
            groups: action.groups,
            position: 0,
          }).then((created) => {
            if (created) setActiveViewId(created.id);
          });
          break;
        }
      }
    }
  }, [pages, currentPage, user, addCustomView]);

  // Process a single message through the agent API
  const processMessage = useCallback(async (
    message: string,
    confirmedValue?: string | null,
  ) => {
    if (!user) return;

    try {
      // Build conversation history with page/section structure context
      // This helps the agent match spoken names (e.g. "ops app" → "Ops App")
      const history = chatState.getConversationHistory();
      const pageStructure = pages.map(p =>
        `${p.name}: ${p.sections.map(s => s.name).join(', ')}`,
      ).join('\n');

      const enrichedHistory = [
        {
          role: 'system' as const,
          content: `Available pages and sections:\n${pageStructure}`,
        },
        ...history,
      ];

      const result = await apiClient.agent.call({
        message,
        userId: user.id,
        conversationHistory: enrichedHistory,
        confirmed: confirmedValue || undefined,
        context: {
          currentPage: currentPage?.name,
          currentSection: currentSection?.name,
        },
        customApiKey: settings.custom_openai_key || undefined,
        customModel: settings.custom_openai_model || undefined,
      });

      // Execute any frontend actions
      if (result.actions?.length) {
        executeFrontendActions(result.actions);
      }

      // Handle response type
      switch (result.type) {
        case 'response':
          chatState.addAgentMessage(
            result.message || 'Done.',
            'text_response',
          );
          await refreshData();
          break;

        case 'clarification':
          chatState.addAgentMessage(
            result.question || result.message || 'Could you clarify?',
            'clarification',
            { options: result.options },
          );
          setAwaitingResponse({ type: 'clarification', data: result });
          break;

        case 'confirmation':
          chatState.addAgentMessage(
            result.message || 'Please confirm.',
            'bulk_confirmation',
            { confirmValue: result.confirmValue },
          );
          setAwaitingResponse({ type: 'confirmation', data: result });
          break;

        case 'error':
          chatState.addAgentMessage(
            result.message || 'Something went wrong.',
            'error',
          );
          break;

        case 'plan_proposal':
          if (result.plan) {
            chatState.addAgentMessage(
              result.message || 'Here\'s my plan:',
              'plan_proposal',
              {
                planData: {
                  summary: result.plan.summary,
                  groups: result.plan.groups,
                  totalGroups: result.plan.totalGroups,
                  totalActions: result.plan.totalActions,
                },
                planGroupStatuses: result.plan.groups.map(() => 'pending' as PlanGroupStatus),
                planExecutionState: 'reviewing',
              },
            );
          } else {
            chatState.addAgentMessage(
              result.message || 'Done.',
              'text_response',
            );
          }
          break;

        default:
          chatState.addAgentMessage(
            result.message || 'Done.',
            'text_response',
          );
          await refreshData();
          break;
      }
    } catch (error) {
      const errorMsg = error instanceof Error
        ? error.message
        : 'Failed to connect. Please try again.';
      chatState.addAgentMessage(errorMsg, 'error');
    }
  }, [user, currentPage, currentSection, chatState, executeFrontendActions, refreshData]);

  // Process queued messages
  const processQueue = useCallback(async () => {
    let next = chatState.getNextFromQueue();
    while (next) {
      await processMessage(next.message, next.confirmedValue);
      next = chatState.getNextFromQueue();
    }
  }, [chatState, processMessage]);

  // Main send handler — passed to ChatPanel
  const handleChatMessage = useCallback(async (
    message: string,
    confirmedValue?: string | null,
  ) => {
    if (!confirmedValue) {
      chatState.addUserMessage(message);
    }

    if (chatState.isProcessing()) {
      chatState.addToQueue(message, confirmedValue);
      return;
    }

    chatState.setProcessing(true);
    await processMessage(message, confirmedValue);
    await processQueue();
    chatState.setProcessing(false);
    chatState.compactHistory();
  }, [chatState, processMessage, processQueue]);

  // Handle voice message from VoiceInputScreen
  useEffect(() => {
    const voiceMessage = route.params?.voiceMessage;
    if (voiceMessage) {
      handleChatMessage(voiceMessage);
    }
  }, [route.params?.voiceMessage, handleChatMessage]);

  // Handle user responses to clarifications/confirmations
  const handleUserResponse = useCallback(async (
    response: string,
    messageIndex: number,
  ) => {
    chatState.markMessageResponded(messageIndex);

    if (!awaitingResponse) return;

    if (awaitingResponse.type === 'clarification') {
      chatState.addUserMessage(response);
      await handleChatMessage(response);
    } else if (awaitingResponse.type === 'confirmation') {
      if (response.toLowerCase() === 'yes') {
        chatState.addUserMessage('Yes, proceed.');
        await handleChatMessage(
          'proceed with the confirmed action',
          awaitingResponse.data.confirmValue,
        );
      } else {
        chatState.addUserMessage('No, cancel.');
        chatState.addAgentMessage('Operation cancelled.', 'text_response');
      }
    }

    setAwaitingResponse(null);
  }, [awaitingResponse, chatState, handleChatMessage]);

  // --- Plan handlers ---
  const handlePlanApproveGroup = useCallback((messageIndex: number, groupIndex: number) => {
    const msg = chatState.messages[messageIndex];
    if (!msg?.planGroupStatuses) return;
    const updated = [...msg.planGroupStatuses];
    updated[groupIndex] = 'approved';
    chatState.updateMessage(messageIndex, { planGroupStatuses: updated });
  }, [chatState]);

  const handlePlanSkipGroup = useCallback((messageIndex: number, groupIndex: number) => {
    const msg = chatState.messages[messageIndex];
    if (!msg?.planGroupStatuses) return;
    const updated = [...msg.planGroupStatuses];
    updated[groupIndex] = 'skipped';
    chatState.updateMessage(messageIndex, { planGroupStatuses: updated });
  }, [chatState]);

  const handlePlanApproveAll = useCallback((messageIndex: number) => {
    const msg = chatState.messages[messageIndex];
    if (!msg?.planGroupStatuses) return;
    const updated = msg.planGroupStatuses.map(
      (s: PlanGroupStatus) => s === 'pending' ? 'approved' : s,
    );
    chatState.updateMessage(messageIndex, { planGroupStatuses: updated });
  }, [chatState]);

  const handlePlanCancel = useCallback((messageIndex: number) => {
    chatState.updateMessage(messageIndex, {
      planExecutionState: 'complete',
      responded: true,
    });
    chatState.addAgentMessage('Plan cancelled.', 'text_response');
  }, [chatState]);

  // ====== Demo data lifecycle ======
  const demoDataRef = useRef<{ pageId?: string; sectionId?: string; noteId?: string }>({});

  const handleDemoCreateData = useCallback(async () => {
    if (!user) return;
    try {
      // Create demo page
      const { data: page, error: pageErr } = await supabase
        .from('pages')
        .insert({ name: 'Work Projects', user_id: user.id, position: pages.length })
        .select()
        .single();
      if (pageErr || !page) return;
      demoDataRef.current.pageId = page.id;

      // Create default section
      const { data: section, error: secErr } = await supabase
        .from('sections')
        .insert({ name: 'General', page_id: page.id, position: 0 })
        .select()
        .single();
      if (secErr || !section) return;
      demoDataRef.current.sectionId = section.id;

      // Create demo note
      const { data: note, error: noteErr } = await supabase
        .from('notes')
        .insert({
          content: 'Review the Q3 budget report',
          section_id: section.id,
          tags: ['urgent'],
          created_by_user_id: user.id,
        })
        .select()
        .single();
      if (!noteErr && note) {
        demoDataRef.current.noteId = note.id;
      }

      // Refresh data and navigate to the new page
      await refreshData();
      setCurrentPageId(page.id);
      setCurrentSectionId(section.id);
    } catch (e) {
      console.error('Demo data creation failed:', e);
    }
  }, [user, pages.length, refreshData]);

  const handleDemoCleanupData = useCallback(async () => {
    const { pageId, noteId, sectionId } = demoDataRef.current;
    console.log('[DEMO CLEANUP] ids:', { pageId, noteId, sectionId });
    try {
      if (noteId) {
        const { error: noteErr } = await supabase.from('notes').delete().eq('id', noteId);
        console.log('[DEMO CLEANUP] note delete:', noteErr ? noteErr.message : 'ok');
      }
      if (sectionId) {
        const { error: secErr } = await supabase.from('sections').delete().eq('id', sectionId);
        console.log('[DEMO CLEANUP] section delete:', secErr ? secErr.message : 'ok');
      }
      if (pageId) {
        const { error: pageErr } = await supabase.from('pages').delete().eq('id', pageId);
        console.log('[DEMO CLEANUP] page delete:', pageErr ? pageErr.message : 'ok');
      }
      demoDataRef.current = {};
      await refreshData();
      setCurrentPageId(null);
      setCurrentSectionId(null);
    } catch (e) {
      console.error('Demo data cleanup failed:', e);
    }
  }, [refreshData]);

  const executePlanGroup = useCallback(async (
    actions: PlanAction[],
    context: { lastPageId: string | undefined; lastSectionId: string | undefined; createdPages: Record<string, string>; createdSections: Record<string, string> },
  ) => {
    const results: string[] = [];
    const updatedContext = { ...context };

    for (const action of actions) {
      switch (action.type) {
        case 'create_page': {
          const pageName = action.name || action.pageName || 'Untitled';
          const { data, error } = await supabase
            .from('pages')
            .insert({
              name: pageName,
              user_id: user!.id,
              position: pages.length,
            })
            .select()
            .single();
          if (error) throw new Error(`Failed to create page "${pageName}": ${error.message}`);
          updatedContext.lastPageId = data.id;
          updatedContext.createdPages[pageName.toLowerCase()] = data.id;
          // Create a default section for the page
          const { data: sectionData, error: sectionError } = await supabase
            .from('sections')
            .insert({
              name: 'General',
              page_id: data.id,
              position: 0,
            })
            .select()
            .single();
          if (!sectionError && sectionData) {
            updatedContext.lastSectionId = sectionData.id;
            updatedContext.createdSections['general'] = sectionData.id;
          }
          results.push(`Created page "${pageName}"`);
          break;
        }
        case 'create_section': {
          const sectionName = action.name || action.sectionName || 'Untitled';
          // Resolve page: use explicit pageName, or fall back to last created page
          let pageId = updatedContext.lastPageId;
          if (action.pageName) {
            const key = action.pageName.toLowerCase();
            pageId = updatedContext.createdPages[key]
              || pages.find(p => p.name.toLowerCase() === key)?.id
              || pageId;
          }
          if (!pageId) throw new Error(`No page found for section "${sectionName}"`);
          const { data, error } = await supabase
            .from('sections')
            .insert({
              name: sectionName,
              page_id: pageId,
              position: 0,
            })
            .select()
            .single();
          if (error) throw new Error(`Failed to create section "${sectionName}": ${error.message}`);
          updatedContext.lastSectionId = data.id;
          updatedContext.createdSections[sectionName.toLowerCase()] = data.id;
          results.push(`Created section "${sectionName}"`);
          break;
        }
        case 'create_note':
        case 'schedule_note': {
          const content = action.content || '';
          // Resolve section: use explicit sectionName, or fall back to last created section
          let sectionId = updatedContext.lastSectionId;
          if (action.sectionName) {
            const key = action.sectionName.toLowerCase();
            sectionId = updatedContext.createdSections[key] || sectionId;
            // Also check existing pages/sections
            if (!sectionId) {
              for (const p of pages) {
                const sec = p.sections.find(s => s.name.toLowerCase() === key);
                if (sec) { sectionId = sec.id; break; }
              }
            }
          }
          if (!sectionId) throw new Error('No section found for note');
          const noteInsert: Record<string, unknown> = {
            content,
            section_id: sectionId,
            tags: action.tags || [],
            date: action.date || null,
            created_by_user_id: user!.id,
          };
          // Calendar fields for schedule_note
          if (action.start_time) noteInsert.start_time = action.start_time;
          if (action.end_time) noteInsert.end_time = action.end_time;
          if (action.reminder_minutes != null) noteInsert.reminder_minutes = action.reminder_minutes;

          const { data: createdNote, error } = await supabase
            .from('notes')
            .insert(noteInsert)
            .select()
            .single();
          if (error) throw new Error(`Failed to create note: ${error.message}`);

          // Auto-sync to calendar if note has start_time and calendar sync is enabled
          if (createdNote?.start_time && settings.calendar_sync_enabled) {
            try {
              await syncNote(createdNote as Note);
            } catch (e) {
              console.log('[MainScreen] Calendar sync failed for new note:', e);
            }
          }

          results.push(action.type === 'schedule_note' ? `Scheduled note` : `Added note`);
          break;
        }
        case 'delete_page': {
          const pageName = action.name || action.pageName;
          const page = pages.find(p => p.name.toLowerCase() === (pageName || '').toLowerCase());
          if (!page) throw new Error(`Page "${pageName}" not found`);
          const { error } = await supabase.from('pages').delete().eq('id', page.id);
          if (error) throw new Error(`Failed to delete page: ${error.message}`);
          results.push(`Deleted page "${pageName}"`);
          break;
        }
        case 'delete_section': {
          const sectionName = action.name || action.sectionName;
          let sectionId: string | undefined;
          for (const p of pages) {
            const sec = p.sections.find(s => s.name.toLowerCase() === (sectionName || '').toLowerCase());
            if (sec) { sectionId = sec.id; break; }
          }
          if (!sectionId) throw new Error(`Section "${sectionName}" not found`);
          const { error } = await supabase.from('sections').delete().eq('id', sectionId);
          if (error) throw new Error(`Failed to delete section: ${error.message}`);
          results.push(`Deleted section "${sectionName}"`);
          break;
        }
        case 'delete_notes': {
          // delete_notes uses a filter to find matching notes
          if (action.filter) {
            let query = supabase.from('notes').delete();
            if (action.filter.section_id) {
              query = query.eq('section_id', action.filter.section_id);
            }
            if (action.filter.tags && action.filter.tags.length > 0) {
              query = query.contains('tags', action.filter.tags);
            }
            if (action.filter.note_ids && action.filter.note_ids.length > 0) {
              query = query.in('id', action.filter.note_ids);
            }
            const { error } = await query;
            if (error) throw new Error(`Failed to delete notes: ${error.message}`);
          }
          results.push('Deleted notes');
          break;
        }
        case 'check_schedule': {
          if (action.start_time && action.end_time) {
            const conflicts = await useCalendarStore.getState().checkConflicts(
              action.start_time as string,
              action.end_time as string,
            );
            if (conflicts.length > 0) {
              results.push(`Found ${conflicts.length} conflict(s): ${conflicts.map(c => c.title).join(', ')}`);
            } else {
              results.push('No scheduling conflicts found');
            }
          }
          break;
        }
      }
    }

    return { results, updatedContext };
  }, [user, pages]);

  const handlePlanExecute = useCallback(async (messageIndex: number) => {
    const msg = chatState.messages[messageIndex];
    if (!msg?.planData || !msg?.planGroupStatuses) return;

    chatState.updateMessage(messageIndex, { planExecutionState: 'executing' });

    let context = {
      lastPageId: undefined as string | undefined,
      lastSectionId: undefined as string | undefined,
      createdPages: {} as Record<string, string>,
      createdSections: {} as Record<string, string>,
    };

    const allResults: string[] = [];
    let hasError = false;

    for (let i = 0; i < msg.planData.groups.length; i++) {
      if (msg.planGroupStatuses[i] !== 'approved') continue;

      try {
        const { results, updatedContext } = await executePlanGroup(
          msg.planData.groups[i].actions,
          context,
        );
        context = updatedContext;
        allResults.push(...results);
      } catch (error) {
        hasError = true;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        allResults.push(`Error: ${errorMsg}`);
        break;
      }
    }

    chatState.updateMessage(messageIndex, {
      planExecutionState: 'complete',
      responded: true,
    });

    await refreshData();

    if (hasError) {
      chatState.addAgentMessage(
        `Partially completed. ${allResults.join('. ')}`,
        'error',
      );
    } else {
      const skippedCount = msg.planGroupStatuses.filter((s: PlanGroupStatus) => s === 'skipped').length;
      const summary = skippedCount > 0
        ? `Done! ${allResults.length} actions completed, ${skippedCount} group(s) skipped.`
        : `Done! ${allResults.length} actions completed.`;
      chatState.addAgentMessage(summary, 'text_response');
    }
  }, [chatState, executePlanGroup, refreshData]);

  // --- Page context menu handlers ---
  const handleToggleStar = useCallback(() => {
    if (!currentPageId || !currentPage) return;
    updatePage(currentPageId, { starred: !currentPage.starred });
    setHeaderMenuOpen(false);
  }, [currentPageId, currentPage, updatePage]);

  const isDefaultPage = settings.default_page_id === currentPageId;

  const handleSetDefault = useCallback(() => {
    if (!currentPageId) return;
    const { updateSetting } = useSettingsStore.getState();
    updateSetting('default_page_id', currentPageId);
    updateSetting('default_section_id', currentSectionId);
    setHeaderMenuOpen(false);
  }, [currentPageId, currentSectionId]);

  const handleClearDefault = useCallback(() => {
    const { updateSetting } = useSettingsStore.getState();
    updateSetting('default_page_id', null);
    updateSetting('default_section_id', null);
    setHeaderMenuOpen(false);
  }, []);

  // --- Drag-to-move handlers ---
  const handleDragStart = useCallback((noteId: string, absoluteY: number) => {
    setDraggingNoteId(noteId);
    setDragPos({ x: 0, y: absoluteY });
  }, []);

  const handleDragMove = useCallback((absoluteX: number, absoluteY: number) => {
    setDragPos({ x: absoluteX, y: absoluteY });
  }, []);

  const handleDragEnd = useCallback(async (absoluteX: number, absoluteY: number) => {
    if (!draggingNoteId) {
      setDraggingNoteId(null);
      return;
    }

    // Find the hovered drop target
    const target = dropTargetsRef.current.find(
      (t) => absoluteX >= (Dimensions.get('window').width - Dimensions.get('window').width * 0.55) &&
        absoluteY >= t.y && absoluteY <= t.y + t.height,
    );

    if (target) {
      Vibration.vibrate(30);
      await moveNote(draggingNoteId, target.sectionId);
    }

    setDraggingNoteId(null);
    setDragPos({ x: 0, y: 0 });
  }, [draggingNoteId, moveNote]);

  const handleDragCancel = useCallback(() => {
    setDraggingNoteId(null);
    setDragPos({ x: 0, y: 0 });
  }, []);

  const handleDropTargetsReady = useCallback((targets: DropTarget[]) => {
    dropTargetsRef.current = targets;
  }, []);

  // --- Note toggle/delete handlers ---
  const handleNoteToggle = useCallback((noteId: string) => {
    const note = allNotes.find((n) => n.id === noteId);
    if (!note) return;
    const nowCompleted = !note.completed;
    updateNote(noteId, {
      completed: nowCompleted,
      completed_by_user_id: nowCompleted ? user?.id ?? null : null,
      completed_at: nowCompleted ? new Date().toISOString() : null,
    });
    // Remove calendar event when completing
    if (nowCompleted && note.calendar_event_id) {
      unsyncNote(note);
    }
  }, [allNotes, updateNote, user, unsyncNote]);

  const handleNoteDelete = useCallback((noteId: string) => {
    const note = allNotes.find((n) => n.id === noteId);
    if (note?.calendar_event_id) {
      unsyncNote(note);
    }
    removeNote(noteId);
  }, [allNotes, removeNote, unsyncNote]);

  // DateTimePicker handlers
  const handleDatePress = useCallback((note: Note) => {
    setDatePickerNote(note);
  }, []);

  const handleDateTimeSave = useCallback(async (updates: {
    date: string | null;
    start_time: string | null;
    end_time: string | null;
    reminder_minutes: number | null;
    syncToCalendar: boolean;
  }) => {
    if (!datePickerNote) return;
    const noteId = datePickerNote.id;

    // Update note in store (persists to Supabase)
    updateNote(noteId, {
      date: updates.date,
      start_time: updates.start_time,
      end_time: updates.end_time,
      reminder_minutes: updates.reminder_minutes,
    });

    // Sync to calendar if requested
    if (updates.syncToCalendar && updates.start_time) {
      const updatedNote = {
        ...datePickerNote,
        date: updates.date,
        start_time: updates.start_time,
        end_time: updates.end_time,
        reminder_minutes: updates.reminder_minutes,
      };
      await syncNote(updatedNote);
    } else if (!updates.syncToCalendar && datePickerNote.calendar_event_id) {
      // Unsync if toggle turned off
      await unsyncNote(datePickerNote);
    }

    setDatePickerNote(null);
    refreshData();
  }, [datePickerNote, updateNote, syncNote, unsyncNote, refreshData]);

  // Get notes for current view, with sorting applied
  const getNotes = (): Note[] => {
    if (!currentPage) return [];

    let result: Note[];
    if (currentSectionId) {
      result = getNotesForSection(currentSectionId);
    } else {
      result = currentPage.sections.flatMap((section) =>
        getNotesForSection(section.id)
      );
    }

    // Apply custom AI sort order if present
    if (customSortOrder) {
      const orderMap = new Map(customSortOrder.map((id, i) => [id, i]));
      return [...result].sort((a, b) => {
        const ai = orderMap.get(a.id) ?? Infinity;
        const bi = orderMap.get(b.id) ?? Infinity;
        return ai - bi;
      });
    }

    // Apply sort mode
    switch (sortMode) {
      case 'created_asc':
        return [...result].sort((a, b) => a.created_at.localeCompare(b.created_at));
      case 'alpha':
        return [...result].sort((a, b) => a.content.localeCompare(b.content));
      case 'completed_last':
        return [...result].sort((a, b) => {
          if (a.completed !== b.completed) return a.completed ? 1 : -1;
          return b.created_at.localeCompare(a.created_at);
        });
      case 'created_desc':
      default:
        return [...result].sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
  };

  const notes = getNotes();

  // Group notes for active custom view
  const activeView = activeViewId ? customViews.find(v => v.id === activeViewId) : null;

  const groupNotesForView = useCallback((noteList: Note[], groups: CustomViewGroup[]): { title: string; data: Note[] }[] => {
    const sections: { title: string; data: Note[] }[] = [];
    const used = new Set<string>();

    for (const group of groups) {
      const matching = noteList.filter(n => {
        if (used.has(n.id)) return false;
        if (group.filter.tags?.length && !group.filter.tags.every(t => n.tags?.includes(t))) return false;
        if (group.filter.completed !== undefined && n.completed !== group.filter.completed) return false;
        if (group.filter.search && !n.content.toLowerCase().includes(group.filter.search.toLowerCase())) return false;
        return true;
      });
      matching.forEach(n => used.add(n.id));
      sections.push({ title: `${group.name} (${matching.length})`, data: matching });
    }

    const other = noteList.filter(n => !used.has(n.id));
    if (other.length > 0) {
      sections.push({ title: `Other (${other.length})`, data: other });
    }
    return sections;
  }, []);

  const groupedSections = activeView ? groupNotesForView(notes, activeView.groups) : null;

  const renderNote = useCallback(
    ({ item: note }: { item: Note }) => (
      <NoteCard
        note={note}
        density={density}
        creatorProfile={note.created_by_user_id ? userProfiles[note.created_by_user_id] : undefined}
        onToggle={handleNoteToggle}
        onDelete={handleNoteDelete}
        onDatePress={handleDatePress}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      />
    ),
    [density, userProfiles, handleNoteToggle, handleNoteDelete, handleDatePress, handleDragStart, handleDragMove, handleDragEnd, handleDragCancel]
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>No notes yet</Text>
      <Text style={styles.emptySubtitle}>
        Use the chat to add notes to this page
      </Text>
    </View>
  );

  return (
    <GestureDetector gesture={edgeSwipeGesture}>
      <View style={styles.container}>
        <MobileHeader
          currentPage={currentPage?.name || (currentPageId ? undefined : 'Home')}
          currentSection={currentSection?.name}
          showBack={!!currentSectionId}
          isDrawerOpen={sidebarOpen}
          onMenuPress={() => setSidebarOpen(!sidebarOpen)}
          onMorePress={() => currentPageId ? setHeaderMenuOpen(!headerMenuOpen) : undefined}
          onBackPress={handleBackPress}
        />

        {/* Shared page accept/decline banner */}
        {isPendingShare && currentSharedPage && (
          <SharedPageBanner
            role={currentSharedPage.myRole}
            ownerEmail={currentSharedPage.ownerEmail}
            onAccept={() => acceptSharedPage(currentPageId!)}
            onDecline={() => declineSharedPage(currentPageId!)}
          />
        )}

        {/* Page/Section context menu */}
        <PageContextMenu
          visible={headerMenuOpen}
          onClose={() => setHeaderMenuOpen(false)}
          onRename={() => {
            setHeaderMenuOpen(false);
            // TODO: Implement rename flow
          }}
          onShare={() => {
            setHeaderMenuOpen(false);
            setShareOpen(true);
          }}
          onToggleStar={handleToggleStar}
          isStarred={currentPage?.starred || false}
          isSharedPage={!!currentSharedPage}
          pageName={currentPage?.name}
          isDefault={isDefaultPage}
          onSetDefault={handleSetDefault}
          onClearDefault={handleClearDefault}
          onLeavePage={currentSharedPage ? () => {
            setHeaderMenuOpen(false);
            Alert.alert(
              'Leave page?',
              'You will lose access.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Leave',
                  style: 'destructive',
                  onPress: async () => {
                    await declineSharedPage(currentPageId!);
                    setCurrentPageId(pages[0]?.id || null);
                    setCurrentSectionId(null);
                  },
                },
              ],
            );
          } : undefined}
        />

        {/* Main content: HomeView when no page selected, FlatList otherwise */}
        {!currentPageId ? (
          <GestureDetector gesture={pinchGesture}>
            <View style={{ flex: 1 }}>
              <HomeView
                pages={[...pages, ...sharedPages]}
                notes={allNotes}
                loading={loading}
                zoomLevel={homeZoomIndex}
                onNavigate={handleNavigate}
                onRefresh={refreshData}
                bottomInset={insets.bottom}
              />
            </View>
          </GestureDetector>
        ) : (
          <GestureDetector gesture={pinchGesture}>
            <View style={{ flex: 1 }}>
              {/* Sort chip bar */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ flexGrow: 0, flexShrink: 0 }}
                contentContainerStyle={styles.sortChipBar}
              >
                {([
                  { key: 'created_desc' as const, label: 'NEWEST' },
                  { key: 'created_asc' as const, label: 'OLDEST' },
                  { key: 'alpha' as const, label: 'A-Z' },
                  { key: 'completed_last' as const, label: 'TODO FIRST' },
                ] as const).map((chip) => (
                  <TouchableOpacity
                    key={chip.key}
                    style={[
                      styles.sortChip,
                      sortMode === chip.key && !customSortOrder && { borderColor: colors.primary },
                    ]}
                    onPress={() => {
                      setSortMode(chip.key);
                      setCustomSortOrder(null);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.sortChipText,
                        sortMode === chip.key && !customSortOrder && { color: colors.primary },
                      ]}
                    >
                      {chip.label}
                    </Text>
                  </TouchableOpacity>
                ))}
                {customSortOrder && (
                  <TouchableOpacity
                    style={[styles.sortChip, { borderColor: colors.primary }]}
                    onPress={() => setCustomSortOrder(null)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.sortChipText, { color: colors.primary }]}>
                      AI SORT ✕
                    </Text>
                  </TouchableOpacity>
                )}
                {activeViewId && (() => {
                  const activeView = customViews.find(v => v.id === activeViewId);
                  return activeView ? (
                    <TouchableOpacity
                      style={[styles.sortChip, { borderColor: colors.primary }]}
                      onPress={() => setActiveViewId(null)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.sortChipText, { color: colors.primary }]}>
                        VIEW: {activeView.title} ✕
                      </Text>
                    </TouchableOpacity>
                  ) : null;
                })()}
                {customViews.some(v =>
                  v.page_id === currentPageId &&
                  (v.section_id === null || v.section_id === currentSectionId)
                ) && (
                  <TouchableOpacity
                    style={[styles.sortChip, showViewDropdown && { borderColor: colors.primary }]}
                    onPress={() => setShowViewDropdown(!showViewDropdown)}
                    activeOpacity={0.7}
                  >
                    <Layers size={14} color={showViewDropdown ? colors.primary : staticColors.textMuted} />
                  </TouchableOpacity>
                )}
              </ScrollView>

              {/* Custom view dropdown */}
              {showViewDropdown && (
                <>
                  <Pressable
                    style={styles.viewDropdownBackdrop}
                    onPress={() => setShowViewDropdown(false)}
                  />
                  <View style={[styles.viewDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    {customViews
                      .filter(v =>
                        v.page_id === currentPageId &&
                        (v.section_id === null || v.section_id === currentSectionId)
                      )
                      .map((view) => (
                        <View key={view.id} style={styles.viewDropdownRow}>
                          <TouchableOpacity
                            style={{ flex: 1, paddingVertical: 10 }}
                            onPress={() => {
                              setActiveViewId(view.id);
                              setShowViewDropdown(false);
                            }}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.viewDropdownText, { color: colors.textPrimary }]}>
                              {view.title}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => {
                              Alert.alert(
                                'Delete View',
                                `Delete "${view.title}"?`,
                                [
                                  { text: 'Cancel', style: 'cancel' },
                                  {
                                    text: 'Delete',
                                    style: 'destructive',
                                    onPress: () => {
                                      if (activeViewId === view.id) setActiveViewId(null);
                                      removeCustomView(view.id);
                                    },
                                  },
                                ],
                              );
                            }}
                            activeOpacity={0.7}
                            style={{ padding: 10 }}
                          >
                            <Text style={{ color: staticColors.textMuted, fontSize: 14 }}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                  </View>
                </>
              )}

              {groupedSections ? (
                <SectionList
                  sections={groupedSections}
                  keyExtractor={(note) => note.id}
                  renderItem={renderNote}
                  renderSectionHeader={({ section: { title } }) => (
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionHeaderText}>{title}</Text>
                    </View>
                  )}
                  ListEmptyComponent={renderEmpty}
                  contentContainerStyle={[
                    notes.length === 0 ? styles.emptyList : styles.notesList,
                    { paddingBottom: 180 + insets.bottom },
                  ]}
                  refreshControl={
                    <RefreshControl
                      refreshing={loading}
                      onRefresh={refreshData}
                      tintColor={staticColors.textMuted}
                    />
                  }
                  showsVerticalScrollIndicator={false}
                  keyboardDismissMode="on-drag"
                  stickySectionHeadersEnabled={false}
                />
              ) : (
                <FlatList
                  data={notes}
                  keyExtractor={(note) => note.id}
                  renderItem={renderNote}
                  ListEmptyComponent={renderEmpty}
                  contentContainerStyle={[
                    notes.length === 0 ? styles.emptyList : styles.notesList,
                    { paddingBottom: 180 + insets.bottom },
                  ]}
                  refreshControl={
                    <RefreshControl
                      refreshing={loading}
                      onRefresh={refreshData}
                      tintColor={staticColors.textMuted}
                    />
                  }
                  showsVerticalScrollIndicator={false}
                  keyboardDismissMode="on-drag"
                />
              )}
            </View>
          </GestureDetector>
        )}

        {/* Block all interaction outside chat during demo */}
        {!settings.demo_complete && (
          <View
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 899 }}
            pointerEvents="box-only"
          />
        )}

        {/* Floating chat panel - hidden when sidebar open */}
        <ChatPanel
          visible={!sidebarOpen}
          messages={chatState.messages}
          processing={chatState.processing}
          onSendMessage={handleChatMessage}
          onUserResponse={handleUserResponse}
          onPlanApproveGroup={handlePlanApproveGroup}
          onPlanSkipGroup={handlePlanSkipGroup}
          onPlanApproveAll={handlePlanApproveAll}
          onPlanExecute={handlePlanExecute}
          onPlanCancel={handlePlanCancel}
          onDemoCreateData={handleDemoCreateData}
          onDemoCleanupData={handleDemoCleanupData}
          onDemoComplete={handleDemoComplete}
        />

        {/* Sidebar overlay */}
        <MobileSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onNavigate={handleNavigate}
          onSettingsPress={() => setSettingsOpen(true)}
          currentPageId={currentPageId}
          currentSectionId={currentSectionId}
        />

        {/* Settings drawer - slides over sidebar */}
        <SettingsDrawer
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
        />

        {/* Share sheet - slides up from bottom */}
        {currentPageId && currentPage && (
          <ShareSheet
            visible={shareOpen}
            onClose={() => setShareOpen(false)}
            pageId={currentPageId}
            pageName={currentPage.name}
          />
        )}

        {/* Date/time picker */}
        {datePickerNote && (
          <DateTimePicker
            visible={!!datePickerNote}
            note={datePickerNote}
            onSave={handleDateTimeSave}
            onClose={() => setDatePickerNote(null)}
          />
        )}

        {/* Drag-to-move overlay */}
        <MoveOverlay
          visible={!!draggingNoteId}
          pages={pages}
          dragX={dragPos.x}
          dragY={dragPos.y}
          noteContent={draggingNote?.content || ''}
          onTargetsReady={handleDropTargetsReady}
        />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: staticColors.bg,
  },
  notesList: {
    paddingHorizontal: 16,
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
  sortChipBar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sortChip: {
    borderWidth: 1,
    borderColor: staticColors.border,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  sortChipText: {
    fontFamily: theme.fonts.medium,
    fontSize: 11,
    color: staticColors.textMuted,
    letterSpacing: 0.5,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
  },
  sectionHeaderText: {
    fontFamily: theme.fonts.semibold,
    fontSize: 13,
    color: staticColors.textSecondary,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  viewDropdownBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
  },
  viewDropdown: {
    position: 'absolute',
    top: 46,
    right: 16,
    minWidth: 200,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 12,
    zIndex: 51,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  viewDropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  viewDropdownText: {
    fontFamily: theme.fonts.medium,
    fontSize: 14,
  },
});
