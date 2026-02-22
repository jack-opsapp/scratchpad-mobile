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
import { ChevronRight, ChevronLeft } from 'lucide-react-native';
import { useDataStore } from '../stores/dataStore';
import { colors as staticColors, theme } from '../styles';
import type { RootStackScreenProps } from '../navigation/types';
import type { Section } from '@slate/shared';

type Props = RootStackScreenProps<'Page'>;
type NavigationProp = Props['navigation'];

export default function PageScreen({ route }: Props) {
  const { pageId, pageName } = route.params;
  const navigation = useNavigation<NavigationProp>();
  const { pages, getNotesForSection } = useDataStore();

  const page = pages.find((p) => p.id === pageId);
  const sections = page?.sections || [];

  const handleSectionPress = useCallback(
    (section: Section) => {
      navigation.navigate('Section', {
        sectionId: section.id,
        sectionName: section.name,
      });
    },
    [navigation]
  );

  const renderSection = ({ item: section }: { item: Section }) => {
    const noteCount = getNotesForSection(section.id).length;

    return (
      <TouchableOpacity
        style={styles.sectionItem}
        onPress={() => handleSectionPress(section)}
        activeOpacity={0.7}
      >
        <View style={styles.sectionInfo}>
          <Text style={styles.sectionName}>{section.name}</Text>
          <Text style={styles.sectionStats}>{noteCount} notes</Text>
        </View>
        <ChevronRight size={16} color={staticColors.textMuted} />
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>No sections yet</Text>
      <Text style={styles.emptySubtitle}>
        Use the chat to create sections for this page
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
          <Text style={styles.backText}>PAGES</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.titleContainer}>
        <Text style={styles.pageTitle}>{pageName}</Text>
        <Text style={styles.sectionCount}>
          {sections.length} {sections.length === 1 ? 'section' : 'sections'}
        </Text>
      </View>

      <FlatList
        data={sections}
        keyExtractor={(section) => section.id}
        renderItem={renderSection}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={
          sections.length === 0 ? styles.emptyList : styles.list
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
  pageTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.medium,
    color: staticColors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  sectionCount: {
    fontSize: theme.fontSize.sm,
    color: staticColors.textMuted,
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
    borderBottomColor: staticColors.border,
  },
  sectionInfo: {
    flex: 1,
  },
  sectionName: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.normal,
    color: staticColors.textPrimary,
  },
  sectionStats: {
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
