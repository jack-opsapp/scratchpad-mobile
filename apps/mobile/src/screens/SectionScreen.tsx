import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, Square, CheckSquare } from 'lucide-react-native';
import { useDataStore } from '../stores/dataStore';
import { colors as staticColors, theme } from '../styles';
import { useTheme } from '../contexts/ThemeContext';
import type { RootStackScreenProps } from '../navigation/types';
import type { Note } from '@slate/shared';

type Props = RootStackScreenProps<'Section'>;

export default function SectionScreen({ route }: Props) {
  const { sectionId, sectionName } = route.params;
  const navigation = useNavigation();
  const colors = useTheme();
  const { getNotesForSection } = useDataStore();

  const notes = getNotesForSection(sectionId);

  const renderNote = ({ item: note }: { item: Note }) => {
    const isCompleted = note.status === 'completed';

    return (
      <View style={styles.noteItem}>
        <View style={styles.checkbox}>
          {isCompleted ? (
            <CheckSquare size={20} color={colors.primary} />
          ) : (
            <Square size={20} color={staticColors.border} />
          )}
        </View>
        <View style={styles.noteContent}>
          <Text
            style={[styles.noteText, isCompleted && styles.noteTextCompleted]}
          >
            {note.content}
          </Text>
          {note.due_date && (
            <Text style={styles.noteMeta}>
              Due: {new Date(note.due_date).toLocaleDateString()}
            </Text>
          )}
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>No notes yet</Text>
      <Text style={styles.emptySubtitle}>
        Use the chat to add notes to this section
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <ChevronLeft size={20} color={staticColors.textMuted} />
          <Text style={styles.backText}>BACK</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.titleContainer}>
        <Text style={styles.sectionTitle}>{sectionName}</Text>
        <Text style={styles.noteCount}>
          {notes.length} {notes.length === 1 ? 'note' : 'notes'}
        </Text>
      </View>

      <FlatList
        data={notes}
        keyExtractor={(note) => note.id}
        renderItem={renderNote}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={
          notes.length === 0 ? styles.emptyList : styles.list
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: staticColors.bg,
  },
  header: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: staticColors.border,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.medium,
    color: staticColors.textMuted,
    letterSpacing: 1.5,
    marginLeft: theme.spacing.xs,
  },
  titleContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: staticColors.border,
  },
  sectionTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.medium,
    color: staticColors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  noteCount: {
    fontSize: theme.fontSize.sm,
    color: staticColors.textMuted,
  },
  list: {
    paddingHorizontal: theme.spacing.md,
  },
  emptyList: {
    flex: 1,
  },
  noteItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: staticColors.border,
  },
  checkbox: {
    marginRight: theme.spacing.sm,
    marginTop: 2,
  },
  noteContent: {
    flex: 1,
  },
  noteText: {
    fontSize: theme.fontSize.base,
    color: staticColors.textPrimary,
    lineHeight: 20,
  },
  noteTextCompleted: {
    color: staticColors.textMuted,
    textDecorationLine: 'line-through',
  },
  noteMeta: {
    fontSize: theme.fontSize.sm,
    color: staticColors.textMuted,
    marginTop: theme.spacing.xs,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  emptyTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.normal,
    color: staticColors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  emptySubtitle: {
    fontSize: theme.fontSize.md,
    color: staticColors.textMuted,
    textAlign: 'center',
  },
});
