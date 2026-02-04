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
import { colors, theme } from '../styles';
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
        style={styles.pageCard}
        onPress={() => handlePagePress(page)}
        activeOpacity={0.7}
      >
        <View style={styles.pageInfo}>
          <View style={styles.pageTitleRow}>
            {page.starred && (
              <Star
                size={16}
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
        <ChevronRight size={20} color={colors.textMuted} />
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
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pages</Text>
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
            tintColor={colors.primary}
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
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: colors.textPrimary,
  },
  errorBanner: {
    backgroundColor: colors.error + '20',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
  },
  errorText: {
    color: colors.error,
    fontSize: theme.fontSize.sm,
  },
  list: {
    padding: theme.spacing.md,
  },
  emptyList: {
    flex: 1,
  },
  pageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
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
    fontWeight: theme.fontWeight.medium,
    color: colors.textPrimary,
  },
  pageStats: {
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
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.medium,
    color: colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  emptySubtitle: {
    fontSize: theme.fontSize.md,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
