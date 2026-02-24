import { create } from 'zustand';
import type { Note } from '@slate/shared';
import * as calendarService from '../services/calendarService';
import { ConflictEvent } from '../services/calendarService';
import { supabase } from '../services/supabase';
import { useDataStore } from './dataStore';

interface CalendarState {
  hasPermission: boolean;
  slateCalendarId: string | null;
  syncing: boolean;

  // Actions
  initialize: () => Promise<boolean>;
  syncNote: (note: Note) => Promise<string | null>;
  unsyncNote: (note: Note) => Promise<void>;
  checkConflicts: (startTime: string, endTime: string) => Promise<ConflictEvent[]>;
  bulkSync: (notes: Note[], onProgress?: (done: number, total: number) => void) => Promise<number>;
}

export const useCalendarStore = create<CalendarState>()((set, get) => ({
  hasPermission: false,
  slateCalendarId: null,
  syncing: false,

  initialize: async () => {
    const granted = await calendarService.requestPermission();
    set({ hasPermission: granted });

    if (granted) {
      const calId = await calendarService.getOrCreateSlateCalendar();
      set({ slateCalendarId: calId });
      console.log('[CalendarStore] Initialized, calendar:', calId);
      return true;
    }

    console.log('[CalendarStore] Permission denied');
    return false;
  },

  syncNote: async (note: Note) => {
    const { slateCalendarId } = get();
    if (!slateCalendarId) {
      console.log('[CalendarStore] No calendar ID, skipping sync');
      return null;
    }
    if (!note.start_time) {
      console.log('[CalendarStore] Note has no start_time, skipping sync');
      return null;
    }

    set({ syncing: true });

    try {
      const eventId = await calendarService.syncNoteToCalendar(note, slateCalendarId);

      // Persist calendar_event_id to Supabase
      if (eventId !== note.calendar_event_id) {
        const { error } = await supabase
          .from('notes')
          .update({ calendar_event_id: eventId })
          .eq('id', note.id);

        if (error) {
          console.error('[CalendarStore] Failed to save event ID:', error);
        } else {
          // Update local store
          useDataStore.getState().updateNote(note.id, { calendar_event_id: eventId });
        }
      }

      set({ syncing: false });
      return eventId;
    } catch (e) {
      console.error('[CalendarStore] Sync failed:', e);
      set({ syncing: false });
      return null;
    }
  },

  unsyncNote: async (note: Note) => {
    if (!note.calendar_event_id) return;

    try {
      await calendarService.removeCalendarEvent(note.calendar_event_id);

      // Clear calendar_event_id in Supabase
      await supabase
        .from('notes')
        .update({ calendar_event_id: null })
        .eq('id', note.id);

      // Update local store
      useDataStore.getState().updateNote(note.id, { calendar_event_id: null });
    } catch (e) {
      console.error('[CalendarStore] Unsync failed:', e);
    }
  },

  checkConflicts: async (startTime: string, endTime: string) => {
    try {
      return await calendarService.getConflicts(startTime, endTime);
    } catch (e) {
      console.error('[CalendarStore] Conflict check failed:', e);
      return [];
    }
  },

  bulkSync: async (notes: Note[], onProgress?: (done: number, total: number) => void) => {
    const { syncNote } = get();
    const toSync = notes.filter((n) => n.start_time && !n.calendar_event_id);
    let synced = 0;

    for (const note of toSync) {
      const result = await syncNote(note);
      if (result) synced++;
      onProgress?.(synced, toSync.length);
    }

    return synced;
  },
}));
