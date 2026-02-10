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
import { colors, theme } from '../styles';
import type { Note } from '@slate/shared';

const DELETE_BUTTON_WIDTH = 80;
const LONG_PRESS_DURATION = 500;

interface NoteCardProps {
  note: Note;
  onToggle?: (noteId: string) => void;
  onDelete?: (noteId: string) => void;
  onEdit?: (noteId: string) => void;
  onDragStart?: (noteId: string, absoluteY: number) => void;
  onDragMove?: (absoluteX: number, absoluteY: number) => void;
  onDragEnd?: (absoluteX: number, absoluteY: number) => void;
  onDragCancel?: () => void;
}

export default function NoteCard({
  note,
  onToggle,
  onDelete,
  onEdit,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDragCancel,
}: NoteCardProps) {
  const translateX = useSharedValue(0);
  const isDraggingRef = useRef(false);

  const isCompleted = note.status === 'completed' || (note as any).completed;

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
            <View style={styles.noteContent}>
              {/* Checkbox - 44px touch target, 24x24 square inside */}
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
                    <Check size={14} color={colors.bg} strokeWidth={3} />
                  )}
                </View>
              </TouchableOpacity>

              {/* Content */}
              <View style={styles.textContainer}>
                <Text
                  style={[
                    styles.noteText,
                    isCompleted && styles.noteTextCompleted,
                  ]}
                >
                  {note.content}
                </Text>

                {/* Tags and date */}
                {(note.tags?.length > 0 || note.due_date) && (
                  <View style={styles.metaContainer}>
                    {note.tags?.map((tag) => (
                      <View key={tag} style={styles.tag}>
                        <Text style={styles.tagText}>{tag.toUpperCase()}</Text>
                      </View>
                    ))}
                    {note.due_date && (
                      <Text style={styles.dateText}>
                        {new Date(note.due_date).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                )}
              </View>
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
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noteCard: {
    backgroundColor: colors.bg,
  },
  noteContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 16,
    paddingRight: 16,
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
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxCompleted: {
    borderColor: colors.textMuted,
    backgroundColor: colors.textMuted,
  },
  textContainer: {
    flex: 1,
  },
  noteText: {
    fontFamily: theme.fonts.regular,
    fontSize: 16,
    color: colors.textPrimary,
    lineHeight: 24,
    paddingTop: 2,
  },
  noteTextCompleted: {
    color: colors.textMuted,
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
    borderColor: colors.border,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  tagText: {
    fontFamily: theme.fonts.medium,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  dateText: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
});
