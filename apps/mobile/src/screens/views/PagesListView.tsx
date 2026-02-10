import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { ChevronRight, Star } from 'lucide-react-native';
import { useDataStore } from '../../stores/dataStore';
import { colors, theme } from '../../styles';
import type { PageWithSections } from '@slate/shared';

interface PagesListViewProps {
  onPageSelect: (page: PageWithSections) => void;
}

export default function PagesListView({ onPageSelect }: PagesListViewProps) {
  const { pages, loading, error, refreshData, getNotesForSection } = useDataStore();

  const renderPage = useCallback(
    ({ item: page }: { item: PageWithSections }) => {
      const noteCount = page.sections.reduce((acc, section) => {
        return acc + getNotesForSection(section.id).length;
      }, 0);

      return (
        <TouchableOpacity
          style={styles.pageItem}
          onPress={() => onPageSelect(page)}
          activeOpacity={0.7}
        >
          <View style={styles.pageInfo}>
            <View style={styles.pageTitleRow}>
              {page.starred && (
                <Star
                  size={14}
                  color={colors.primary}
                  fill={colors.primary}
                  style={styles.starIcon}
                />
              )}
              <Text style={styles.pageName}>{page.name}</Text>
            </View>
            <Text style={styles.pageStats}>
              {page.sections.length} sections · {noteCount} notes
            </Text>
          </View>
          <ChevronRight size={16} color={colors.textMuted} />
        </TouchableOpacity>
      );
    },
    [onPageSelect, getNotesForSection]
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>No pages yet</Text>
      <Text style={styles.emptySubtitle}>
        Use the chat to create your first page
      </Text>
    </View>
  );

  if (loading && pages.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.textMuted} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        data={pages}
        keyExtractor={(page) => page.id}
        renderItem={renderPage}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={pages.length === 0 ? styles.emptyList : styles.list}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refreshData}
            tintColor={colors.textMuted}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBanner: {
    borderBottomWidth: 1,
    borderBottomColor: colors.danger,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  errorText: {
    fontFamily: theme.fonts.regular,
    color: colors.danger,
    fontSize: theme.fontSize.sm,
  },
  list: {
    paddingHorizontal: theme.spacing.md,
  },
  emptyList: {
    flex: 1,
  },
  pageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pageInfo: {
    flex: 1,
  },
  pageTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starIcon: {
    marginRight: theme.spacing.xs,
  },
  pageName: {
    fontFamily: theme.fonts.regular,
    fontSize: 16,
    color: colors.textPrimary,
  },
  pageStats: {
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
