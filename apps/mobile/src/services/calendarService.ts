import * as Calendar from 'expo-calendar';
import { PermissionStatus } from 'expo-modules-core';
import { Platform } from 'react-native';
import type { Note } from '@slate/shared';

const SLATE_CALENDAR_TITLE = 'Slate';
const SLATE_CALENDAR_COLOR = '#6366F1'; // Indigo

export interface ConflictEvent {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  calendarTitle: string;
}

/**
 * Check current calendar permission status without prompting.
 */
export async function hasPermission(): Promise<boolean> {
  const { status } = await Calendar.getCalendarPermissionsAsync();
  return status === PermissionStatus.GRANTED;
}

/**
 * Request full calendar access. Returns true if granted.
 */
export async function requestPermission(): Promise<boolean> {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  return status === PermissionStatus.GRANTED;
}

/**
 * Find or create a "Slate" calendar on the device.
 * Returns the calendar ID.
 */
export async function getOrCreateSlateCalendar(): Promise<string> {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const existing = calendars.find((c) => c.title === SLATE_CALENDAR_TITLE);
  if (existing) return existing.id;

  if (Platform.OS === 'ios') {
    const defaultCal = await Calendar.getDefaultCalendarAsync();

    // Try creating a dedicated Slate calendar on the default source
    try {
      const newCalendarId = await Calendar.createCalendarAsync({
        title: SLATE_CALENDAR_TITLE,
        color: SLATE_CALENDAR_COLOR,
        entityType: Calendar.EntityTypes.EVENT,
        sourceId: defaultCal.source.id,
        source: defaultCal.source,
      });
      console.log('[CalendarService] Created Slate calendar:', newCalendarId);
      return newCalendarId;
    } catch (e) {
      // Some accounts (e.g. iCloud) don't allow creating new calendars via API.
      // Fall back to using the default calendar directly.
      console.log('[CalendarService] Cannot create calendar, using default:', defaultCal.id, e);
      return defaultCal.id;
    }
  }

  // Android
  const newCalendarId = await Calendar.createCalendarAsync({
    title: SLATE_CALENDAR_TITLE,
    color: SLATE_CALENDAR_COLOR,
    entityType: Calendar.EntityTypes.EVENT,
    source: {
      isLocalAccount: true,
      name: SLATE_CALENDAR_TITLE,
      type: 'LOCAL',
    },
    name: SLATE_CALENDAR_TITLE,
    ownerAccount: 'slate',
    accessLevel: Calendar.CalendarAccessLevel.OWNER,
  });
  console.log('[CalendarService] Created Slate calendar:', newCalendarId);
  return newCalendarId;
}

/**
 * Create or update a calendar event from a note.
 * Returns the calendar event ID.
 */
export async function syncNoteToCalendar(
  note: Note,
  calendarId: string,
): Promise<string> {
  if (!note.start_time) {
    throw new Error('Note must have a start_time to sync to calendar');
  }

  const startDate = new Date(note.start_time);
  const endDate = note.end_time
    ? new Date(note.end_time)
    : new Date(startDate.getTime() + 60 * 60 * 1000); // Default 1hr

  const title = note.content.length > 100
    ? note.content.substring(0, 97) + '...'
    : note.content;

  const alarms: Calendar.Alarm[] = [];
  if (note.reminder_minutes != null && note.reminder_minutes > 0) {
    alarms.push({ relativeOffset: -note.reminder_minutes });
  }

  const eventData: Omit<Partial<Calendar.Event>, 'id' | 'organizer'> = {
    title,
    startDate,
    endDate,
    notes: `Slate: ${note.id}`,
    alarms,
    allDay: false,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };

  if (note.calendar_event_id) {
    // Update existing event
    try {
      await Calendar.updateEventAsync(note.calendar_event_id, eventData);
      console.log('[CalendarService] Updated event:', note.calendar_event_id);
      return note.calendar_event_id;
    } catch (e) {
      // Event may have been deleted from calendar app; create new one
      console.log('[CalendarService] Update failed, creating new event:', e);
    }
  }

  // Create new event
  const eventId = await Calendar.createEventAsync(calendarId, eventData);
  console.log('[CalendarService] Created event:', eventId);
  return eventId;
}

/**
 * Remove a calendar event by ID.
 */
export async function removeCalendarEvent(eventId: string): Promise<void> {
  try {
    await Calendar.deleteEventAsync(eventId);
    console.log('[CalendarService] Deleted event:', eventId);
  } catch (e) {
    // Event may already be deleted
    console.log('[CalendarService] Delete failed (may already be removed):', e);
  }
}

/**
 * Get events from ALL calendars that conflict with the given time range.
 */
export async function getConflicts(
  startTime: string,
  endTime: string,
): Promise<ConflictEvent[]> {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const calendarIds = calendars.map((c) => c.id);
  const calendarMap = new Map(calendars.map((c) => [c.id, c.title]));

  if (calendarIds.length === 0) return [];

  const events = await Calendar.getEventsAsync(
    calendarIds,
    new Date(startTime),
    new Date(endTime),
  );

  return events.map((e) => ({
    id: e.id,
    title: e.title,
    startDate: typeof e.startDate === 'string' ? e.startDate : e.startDate.toISOString(),
    endDate: typeof e.endDate === 'string' ? e.endDate : e.endDate.toISOString(),
    calendarTitle: calendarMap.get(e.calendarId) || 'Unknown',
  }));
}
