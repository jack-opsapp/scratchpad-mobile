import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useDataStore } from '../../stores/dataStore';
import { colors, theme } from '../../styles';
import type { PageWithSections, Section } from '@slate/shared';

interface PageDetailViewProps {
  page: PageWithSections;
  onSectionSelect: (sectionId: string, sectionName: string) => void;
}

export default function PageDetailView({ page, onSectionSelect }: PageDetailViewProps) {
  const { getNotesForSection } = useDataStore();

  const renderSection = useCallback(
    ({ item: section }: { item: Section }) => {
      const noteCount = getNotesForSection(section.id).length;

      return (
        <TouchableOpacity
          style={styles.sectionItem}
          onPress={() => onSectionSelect(section.id, section.name)}
          activeOpacity={0.7}
        >
          <View style={styles.sectionInfo}>
            <Text style={styles.sectionName}>{section.name}</Text>
            <Text style={styles.sectionStats}>{noteCount} notes</Text>
          </View>
          <ChevronRight size={16} color={colors.textMuted} />
        </TouchableOpacity>
      );
    },
    [onSectionSelect, getNotesForSection]
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>No sections yet</Text>
      <Text style={styles.emptySubtitle}>
        Use the chat to create sections for this page
      </Text>
    </View>
  );

  const sections = page.sections || [];

  return (
    <View style={styles.container}>
      <View style={styles.pageHeader}>
        <Text style={styles.sectionCount}>
          {sections.length} {sections.length === 1 ? 'SECTION' : 'SECTIONS'}
        </Text>
      </View>

      <FlatList
        data={sections}
        keyExtractor={(section) => section.id}
        renderItem={renderSection}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={sections.length === 0 ? styles.emptyList : styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pageHeader: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionCount: {
    fontFamily: theme.fonts.medium,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  list: {
    paddingHorizontal: theme.spacing.md,
  },
  emptyList: {
    flex: 1,
  },
  sectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionInfo: {
    flex: 1,
  },
  sectionName: {
    fontFamily: theme.fonts.regular,
    fontSize: 16,
    color: colors.textPrimary,
  },
  sectionStats: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSize.sm,
    color: colors.textMuted,
    marginTop: theme.spacing.xs,
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
    color: colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  emptySubtitle: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSize.md,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
