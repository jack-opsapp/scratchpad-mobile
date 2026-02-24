import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Platform,
  ScrollView,
} from 'react-native';
import DateTimePickerRN from '@react-native-community/datetimepicker';
import { Calendar, Clock, Bell, AlertTriangle, X } from 'lucide-react-native';
import { colors, theme } from '../styles';
import { useTheme } from '../contexts/ThemeContext';
import { useCalendarStore } from '../stores/calendarStore';
import { useSettingsStore } from '../stores/settingsStore';
import type { Note } from '@slate/shared';
import type { ConflictEvent } from '../services/calendarService';

const REMINDER_OPTIONS = [
  { label: 'None', value: 0 },
  { label: '5 min', value: 5 },
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '1 hour', value: 60 },
];

interface DateTimePickerProps {
  visible: boolean;
  note: Note;
  onSave: (updates: {
    date: string | null;
    start_time: string | null;
    end_time: string | null;
    reminder_minutes: number | null;
    syncToCalendar: boolean;
  }) => void;
  onClose: () => void;
}

function formatMonthDay(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function DateTimePicker({
  visible,
  note,
  onSave,
  onClose,
}: DateTimePickerProps) {
  const themeColors = useTheme();
  const { settings } = useSettingsStore();
  const { checkConflicts } = useCalendarStore();

  // Initialize from note or defaults
  const now = new Date();
  const defaultStart = new Date(now);
  defaultStart.setMinutes(Math.ceil(defaultStart.getMinutes() / 15) * 15, 0, 0);

  const [selectedDate, setSelectedDate] = useState<Date>(
    note.start_time ? new Date(note.start_time) : defaultStart,
  );
  const [startTime, setStartTime] = useState<Date>(
    note.start_time ? new Date(note.start_time) : defaultStart,
  );
  const [endTime, setEndTime] = useState<Date>(
    note.end_time
      ? new Date(note.end_time)
      : new Date(defaultStart.getTime() + 60 * 60 * 1000),
  );
  const [reminderMinutes, setReminderMinutes] = useState<number>(
    note.reminder_minutes ?? settings.calendar_default_reminder,
  );
  const [syncEnabled, setSyncEnabled] = useState(settings.calendar_sync_enabled);
  const [conflicts, setConflicts] = useState<ConflictEvent[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Reset state when note changes
  useEffect(() => {
    if (visible) {
      const newStart = note.start_time ? new Date(note.start_time) : defaultStart;
      const newEnd = note.end_time
        ? new Date(note.end_time)
        : new Date(newStart.getTime() + 60 * 60 * 1000);
      setSelectedDate(newStart);
      setStartTime(newStart);
      setEndTime(newEnd);
      setReminderMinutes(note.reminder_minutes ?? settings.calendar_default_reminder);
      setSyncEnabled(settings.calendar_sync_enabled);
    }
  }, [visible, note.id]);

  // Check conflicts when times change
  useEffect(() => {
    if (!visible) return;
    const start = combineDateAndTime(selectedDate, startTime);
    const end = combineDateAndTime(selectedDate, endTime);
    checkConflicts(start.toISOString(), end.toISOString()).then(setConflicts);
  }, [selectedDate, startTime, endTime, visible]);

  function combineDateAndTime(date: Date, time: Date): Date {
    const result = new Date(date);
    result.setHours(time.getHours(), time.getMinutes(), 0, 0);
    return result;
  }

  const handleSave = useCallback(() => {
    const start = combineDateAndTime(selectedDate, startTime);
    const end = combineDateAndTime(selectedDate, endTime);

    onSave({
      date: formatMonthDay(selectedDate),
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      reminder_minutes: reminderMinutes || null,
      syncToCalendar: syncEnabled,
    });
  }, [selectedDate, startTime, endTime, reminderMinutes, syncEnabled, onSave]);

  const handleClearDate = useCallback(() => {
    onSave({
      date: null,
      start_time: null,
      end_time: null,
      reminder_minutes: null,
      syncToCalendar: false,
    });
  }, [onSave]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Schedule</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Date Row */}
            <TouchableOpacity
              style={styles.row}
              onPress={() => setShowDatePicker(!showDatePicker)}
            >
              <Calendar size={18} color={themeColors.primary} />
              <Text style={styles.rowLabel}>Date</Text>
              <Text style={[styles.rowValue, { color: themeColors.primary }]}>
                {formatMonthDay(selectedDate)}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePickerRN
                value={selectedDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, date) => {
                  if (date) setSelectedDate(date);
                  if (Platform.OS === 'android') setShowDatePicker(false);
                }}
                themeVariant="dark"
              />
            )}

            {/* Start Time Row */}
            <TouchableOpacity
              style={styles.row}
              onPress={() => setShowStartPicker(!showStartPicker)}
            >
              <Clock size={18} color={themeColors.primary} />
              <Text style={styles.rowLabel}>Start</Text>
              <Text style={[styles.rowValue, { color: themeColors.primary }]}>
                {formatTime(startTime)}
              </Text>
            </TouchableOpacity>

            {showStartPicker && (
              <DateTimePickerRN
                value={startTime}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minuteInterval={5}
                onChange={(_, date) => {
                  if (date) {
                    setStartTime(date);
                    // Auto-adjust end time to 1hr after start
                    setEndTime(new Date(date.getTime() + 60 * 60 * 1000));
                  }
                  if (Platform.OS === 'android') setShowStartPicker(false);
                }}
                themeVariant="dark"
              />
            )}

            {/* End Time Row */}
            <TouchableOpacity
              style={styles.row}
              onPress={() => setShowEndPicker(!showEndPicker)}
            >
              <Clock size={18} color={colors.textMuted} />
              <Text style={styles.rowLabel}>End</Text>
              <Text style={[styles.rowValue, { color: themeColors.primary }]}>
                {formatTime(endTime)}
              </Text>
            </TouchableOpacity>

            {showEndPicker && (
              <DateTimePickerRN
                value={endTime}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minuteInterval={5}
                onChange={(_, date) => {
                  if (date) setEndTime(date);
                  if (Platform.OS === 'android') setShowEndPicker(false);
                }}
                themeVariant="dark"
              />
            )}

            {/* Reminder */}
            <View style={styles.row}>
              <Bell size={18} color={colors.textMuted} />
              <Text style={styles.rowLabel}>Reminder</Text>
            </View>
            <View style={styles.chipRow}>
              {REMINDER_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.chip,
                    reminderMinutes === opt.value && {
                      borderColor: themeColors.primary,
                      backgroundColor: themeColors.primary + '15',
                    },
                  ]}
                  onPress={() => setReminderMinutes(opt.value)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      reminderMinutes === opt.value && {
                        color: themeColors.primary,
                      },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Sync toggle */}
            <TouchableOpacity
              style={styles.row}
              onPress={() => setSyncEnabled(!syncEnabled)}
            >
              <View
                style={[
                  styles.toggle,
                  syncEnabled && { backgroundColor: themeColors.primary },
                ]}
              >
                <View
                  style={[
                    styles.toggleDot,
                    syncEnabled && styles.toggleDotActive,
                  ]}
                />
              </View>
              <Text style={styles.rowLabel}>Sync to Calendar</Text>
            </TouchableOpacity>

            {/* Conflicts */}
            {conflicts.length > 0 && (
              <View style={styles.conflictsSection}>
                <View style={styles.conflictHeader}>
                  <AlertTriangle size={14} color={colors.danger} />
                  <Text style={styles.conflictTitle}>
                    {conflicts.length} conflict{conflicts.length > 1 ? 's' : ''}
                  </Text>
                </View>
                {conflicts.map((c) => (
                  <Text key={c.id} style={styles.conflictText}>
                    {c.title} ({c.calendarTitle})
                  </Text>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.clearButton} onPress={handleClearDate}>
              <Text style={styles.clearButtonText}>Clear Date</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: themeColors.primary }]}
              onPress={handleSave}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontFamily: theme.fonts.semibold,
    fontSize: 18,
    color: colors.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  rowLabel: {
    flex: 1,
    fontFamily: theme.fonts.regular,
    fontSize: 16,
    color: colors.textPrimary,
  },
  rowValue: {
    fontFamily: theme.fonts.medium,
    fontSize: 16,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  chipText: {
    fontFamily: theme.fonts.medium,
    fontSize: 13,
    color: colors.textMuted,
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceRaised,
    padding: 2,
    justifyContent: 'center',
  },
  toggleDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.textMuted,
  },
  toggleDotActive: {
    alignSelf: 'flex-end',
    backgroundColor: colors.bg,
  },
  conflictsSection: {
    marginTop: 8,
    padding: 12,
    backgroundColor: colors.danger + '15',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.danger + '30',
  },
  conflictHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  conflictTitle: {
    fontFamily: theme.fonts.semibold,
    fontSize: 13,
    color: colors.danger,
  },
  conflictText: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 20,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  clearButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
  },
  clearButtonText: {
    fontFamily: theme.fonts.medium,
    fontSize: 15,
    color: colors.textSecondary,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 8,
  },
  saveButtonText: {
    fontFamily: theme.fonts.semibold,
    fontSize: 15,
    color: colors.bg,
  },
});
