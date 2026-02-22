import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ChevronRight, Star } from 'lucide-react-native';
import { useDataStore } from '../stores/dataStore';
import { colors as staticColors, theme } from '../styles';
import type { PageWithSections } from '@slate/shared';
import type { RootStackScreenProps } from '../navigation/types';

type NavigationProp = RootStackScreenProps<'Main'>['navigation'];

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { pages, loading, error, fetchData, refreshData } = useDataStore();

  useEffect(() => {
    fetchData();
  }, []);

  const handlePagePress = useCallback((page: PageWithSections) => {
    navigation.navigate('Page', {
      pageId: page.id,
      pageName: page.name,
    });
  }, [navigation]);

  const renderPage = ({ item: page }: { item: PageWithSections }) => {
    const noteCount = page.sections.reduce((acc, section) => {
      return acc + useDataStore.getState().getNotesForSection(section.id).length;
    }, 0);

    return (
      <TouchableOpacity
        style={styles.pageItem}
        onPress={() => handlePagePress(page)}
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
        <ChevronRight size={16} color={staticColors.textMuted} />
      </TouchableOpacity>
    );
  };

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
        <ActivityIndicator size="small" color={staticColors.textMuted} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>PAGES</Text>
      </View>

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
            tintColor={staticColors.textMuted}
          />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: staticColors.bg,
  },
  header: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: staticColors.border,
  },
  headerTitle: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.medium,
    color: staticColors.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  errorBanner: {
    borderBottomWidth: 1,
    borderBottomColor: staticColors.danger,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  errorText: {
    color: staticColors.danger,
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
    borderBottomColor: staticColors.border,
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
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.normal,
    color: staticColors.textPrimary,
  },
  pageStats: {
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
