import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
} from 'react-native';
import { useDataStore } from '../../stores/dataStore';
import { colors as staticColors, theme } from '../../styles';
import type { Note } from '@slate/shared';
import NoteCard from '../../components/NoteCard';

interface SectionDetailViewProps {
  sectionId: string;
  sectionName: string;
}

export default function SectionDetailView({ sectionId }: SectionDetailViewProps) {
  const { getNotesForSection } = useDataStore();
  const notes = getNotesForSection(sectionId);

  const renderNote = useCallback(
    ({ item: note }: { item: Note }) => <NoteCard note={note} />,
    []
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>No notes yet</Text>
      <Text style={styles.emptySubtitle}>
        Use the chat to add notes to this section
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Text style={styles.noteCount}>
          {notes.length} {notes.length === 1 ? 'NOTE' : 'NOTES'}
        </Text>
      </View>

      <FlatList
        data={notes}
        keyExtractor={(note) => note.id}
        renderItem={renderNote}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={notes.length === 0 ? styles.emptyList : styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionHeader: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: staticColors.border,
  },
  noteCount: {
    fontFamily: theme.fonts.medium,
    fontSize: 11,
    color: staticColors.textMuted,
    letterSpacing: 1,
  },
  list: {
    paddingHorizontal: theme.spacing.md,
  },
  emptyList: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  emptyTitle: {
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSize.lg,
    color: staticColors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  emptySubtitle: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSize.md,
    color: staticColors.textMuted,
    textAlign: 'center',
  },
});
