import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Vibration,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Trash2, Check } from 'lucide-react-native';
import { colors as staticColors, theme } from '../styles';
import { useTheme } from '../contexts/ThemeContext';
import type { Note } from '@slate/shared';
import type { UserProfile } from '../stores/dataStore';

const DELETE_BUTTON_WIDTH = 80;
const LONG_PRESS_DURATION = 500;

export type NoteDensity = 'compact' | 'default' | 'comfortable' | 'expanded';

interface NoteCardProps {
  note: Note;
  density?: NoteDensity;
  creatorProfile?: UserProfile;
  pageName?: string;
  sectionName?: string;
  showContext?: boolean;
  onToggle?: (noteId: string) => void;
  onDelete?: (noteId: string) => void;
  onEdit?: (noteId: string) => void;
  onDragStart?: (noteId: string, absoluteY: number) => void;
  onDragMove?: (absoluteX: number, absoluteY: number) => void;
  onDragEnd?: (absoluteX: number, absoluteY: number) => void;
  onDragCancel?: () => void;
}


function getInitials(profile?: UserProfile, userId?: string | null): string {
  if (profile?.full_name) {
    return profile.full_name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  if (profile?.email) {
    return profile.email[0].toUpperCase();
  }
  if (userId) {
    return userId.slice(0, 2).toUpperCase();
  }
  return '?';
}

export default function NoteCard({
  note,
  density = 'comfortable',
  creatorProfile,
  pageName,
  sectionName,
  showContext = false,
  onToggle,
  onDelete,
  onEdit,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDragCancel,
}: NoteCardProps) {
  const colors = useTheme();
  const translateX = useSharedValue(0);
  const isDraggingRef = useRef(false);

  const isCompleted = note.completed;

  const triggerHaptic = useCallback(() => {
    Vibration.vibrate(50);
  }, []);

  const startDrag = useCallback((absY: number) => {
    triggerHaptic();
    isDraggingRef.current = true;
    onDragStart?.(note.id, absY);
  }, [triggerHaptic, note.id, onDragStart]);

  // Combined long-press-then-drag gesture
  const longPressDragGesture = Gesture.Pan()
    .activateAfterLongPress(LONG_PRESS_DURATION)
    .onStart((event) => {
      runOnJS(startDrag)(event.absoluteY);
    })
    .onUpdate((event) => {
      if (onDragMove) {
        runOnJS(onDragMove)(event.absoluteX, event.absoluteY);
      }
    })
    .onEnd((event) => {
      if (onDragEnd) {
        runOnJS(onDragEnd)(event.absoluteX, event.absoluteY);
      }
      isDraggingRef.current = false;
    })
    .onFinalize(() => {
      if (isDraggingRef.current) {
        if (onDragCancel) {
          runOnJS(onDragCancel)();
        }
        isDraggingRef.current = false;
      }
    });

  // Swipe gesture
  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((event) => {
      if (event.translationX < 0) {
        translateX.value = Math.max(-100, event.translationX);
      }
    })
    .onEnd((event) => {
      if (event.translationX < -60 || event.velocityX < -500) {
        translateX.value = withSpring(-DELETE_BUTTON_WIDTH, { damping: 20 });
      } else {
        translateX.value = withTiming(0, { duration: 200 });
      }
    });

  const composedGesture = Gesture.Race(longPressDragGesture, panGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const handleDelete = useCallback(() => {
    translateX.value = withTiming(0, { duration: 200 });
    onDelete?.(note.id);
  }, [note.id, onDelete, translateX]);

  const handleToggle = useCallback(() => {
    onToggle?.(note.id);
  }, [note.id, onToggle]);

  const isCompact = density === 'compact';
  const showCheckbox = density !== 'compact';
  const showMeta = density === 'comfortable' || density === 'expanded';
  const showAvatar = density !== 'compact';
  const showCreatorInfo = density === 'expanded';
  const showContextLabels = showContext && (density === 'default' || density === 'comfortable' || density === 'expanded');

  const accentColor = colors.primary;

  return (
    <>
      <View style={styles.container}>
        {/* Delete button behind */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          activeOpacity={0.8}
        >
          <Trash2 size={20} color="#fff" />
        </TouchableOpacity>

        {/* Note card */}
        <GestureDetector gesture={composedGesture}>
          <Animated.View style={[styles.noteCard, animatedStyle]}>
            <View
              style={[
                styles.noteContent,
                isCompact && styles.noteContentCompact,
              ]}
            >
              {/* Checkbox */}
              {showCheckbox && (
                <TouchableOpacity
                  style={styles.checkboxTouch}
                  onPress={handleToggle}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.checkbox,
                      isCompleted && styles.checkboxCompleted,
                    ]}
                  >
                    {isCompleted && (
                      <Check size={14} color={staticColors.bg} strokeWidth={3} />
                    )}
                  </View>
                </TouchableOpacity>
              )}

              {/* Content */}
              <View style={styles.textContainer}>
                {/* Context labels (page / section) */}
                {showContextLabels && (pageName || sectionName) && (
                  <View style={styles.contextRow}>
                    {pageName && (
                      <Text style={styles.contextText}>
                        {pageName.toUpperCase()}
                      </Text>
                    )}
                    {pageName && sectionName && (
                      <Text style={styles.contextSep}>/</Text>
                    )}
                    {sectionName && (
                      <Text style={styles.contextText}>
                        {sectionName.toUpperCase()}
                      </Text>
                    )}
                  </View>
                )}

                <Text
                  style={[
                    styles.noteText,
                    isCompact && styles.noteTextCompact,
                    isCompleted && styles.noteTextCompleted,
                  ]}
                >
                  {note.content}
                </Text>

                {/* Tags and date — comfortable + expanded only */}
                {showMeta && (note.tags?.length > 0 || note.date) && (
                  <View style={styles.metaContainer}>
                    {note.tags?.map((tag) => (
                      <View key={tag} style={styles.tag}>
                        <Text style={styles.tagText}>{tag.toUpperCase()}</Text>
                      </View>
                    ))}
                    {note.date && (
                      <Text style={styles.dateText}>{note.date}</Text>
                    )}
                  </View>
                )}

                {/* Creator info — expanded only */}
                {showCreatorInfo && creatorProfile && (
                  <View style={styles.creatorInfoRow}>
                    <Text style={styles.creatorName}>
                      {creatorProfile.full_name || creatorProfile.email}
                    </Text>
                    {creatorProfile.full_name && (
                      <Text style={styles.creatorEmail}>
                        {creatorProfile.email}
                      </Text>
                    )}
                  </View>
                )}
              </View>

              {/* Creator avatar */}
              {showAvatar && note.created_by_user_id && (
                <View style={[styles.avatar, { borderColor: accentColor }]}>
                  <Text style={[styles.avatarText, { color: accentColor }]}>
                    {getInitials(creatorProfile, note.created_by_user_id)}
                  </Text>
                </View>
              )}
            </View>
          </Animated.View>
        </GestureDetector>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  deleteButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: DELETE_BUTTON_WIDTH,
    backgroundColor: staticColors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noteCard: {
    backgroundColor: staticColors.bg,
  },
  noteContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: staticColors.border,
    gap: 16,
    paddingRight: 16,
  },
  noteContentCompact: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 0,
  },
  checkboxTouch: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -6,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: staticColors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxCompleted: {
    borderColor: staticColors.textMuted,
    backgroundColor: staticColors.textMuted,
  },
  textContainer: {
    flex: 1,
  },
  contextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 4,
  },
  contextText: {
    fontFamily: theme.fonts.semibold,
    fontSize: 10,
    color: staticColors.textMuted,
    letterSpacing: 1,
  },
  contextSep: {
    fontFamily: theme.fonts.regular,
    fontSize: 10,
    color: staticColors.textMuted,
  },
  noteText: {
    fontFamily: theme.fonts.regular,
    fontSize: 16,
    color: staticColors.textPrimary,
    lineHeight: 24,
    paddingTop: 2,
  },
  noteTextCompact: {
    fontSize: 14,
    lineHeight: 20,
    paddingTop: 0,
  },
  noteTextCompleted: {
    color: staticColors.textMuted,
    textDecorationLine: 'line-through',
  },
  metaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  tag: {
    borderWidth: 1,
    borderColor: staticColors.border,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  tagText: {
    fontFamily: theme.fonts.medium,
    fontSize: 11,
    color: staticColors.textMuted,
    letterSpacing: 0.5,
  },
  dateText: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: staticColors.textMuted,
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  avatarText: {
    fontFamily: theme.fonts.semibold,
    fontSize: 8,
  },
  creatorInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  creatorName: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: staticColors.textMuted,
  },
  creatorEmail: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: staticColors.textMuted,
  },
});
