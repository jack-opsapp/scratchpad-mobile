import React, { useMemo, useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { colors as staticColors, theme } from '../styles';
import type { Note, PageWithSections } from '@slate/shared';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_GAP = 12;
const HORIZONTAL_PADDING = 16;
const GRID_WIDTH = SCREEN_WIDTH - HORIZONTAL_PADDING * 2;

// Zoom level config: 0=2col, 1=1col, 2=1col+3 notes, 3=1col+6 notes
const ZOOM_CONFIG = [
  { columns: 2, noteLines: 0 },
  { columns: 1, noteLines: 0 },
  { columns: 1, noteLines: 3 },
  { columns: 1, noteLines: 6 },
];

interface PageCardData {
  pageId: string;
  pageName: string;
  noteCount: number;
  starred: boolean;
  previewBarWidths: number[];
  previewNoteTexts: string[];
}

// Individual card with Reanimated press animation
const PageCard = memo(function PageCard({
  card,
  cardWidth,
  noteLines,
  onPress,
}: {
  card: PageCardData;
  cardWidth: number;
  noteLines: number;
  onPress: (pageId: string) => void;
}) {
  const scale = useSharedValue(1);
  const [pressed, setPressed] = useState(false);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = useCallback(() => {
    setPressed(true);
    scale.value = withTiming(1.04, { duration: 180 });
    setTimeout(() => {
      onPress(card.pageId);
    }, 200);
  }, [card.pageId, onPress, scale]);

  const showNoteText = noteLines > 0;

  return (
    <Animated.View style={[{ width: cardWidth }, animStyle]}>
      <TouchableOpacity
        style={[styles.card, pressed && styles.cardPressed]}
        onPress={handlePress}
        activeOpacity={1}
      >
        <Text style={styles.cardTitle} numberOfLines={1}>
          {card.pageName.toUpperCase()}
        </Text>

        <View style={styles.previewContainer}>
          {showNoteText ? (
            card.previewNoteTexts.slice(0, noteLines).map((line, i) => (
              <Text key={i} style={styles.notePreviewText} numberOfLines={1}>
                {line}
              </Text>
            ))
          ) : card.previewBarWidths.length > 0 ? (
            card.previewBarWidths.slice(0, 4).map((width, i) => (
              <View
                key={i}
                style={[styles.previewBar, { width: `${width}%` }]}
              />
            ))
          ) : (
            <View style={[styles.previewBar, { width: '40%', opacity: 0.3 }]} />
          )}
        </View>

        <Text style={styles.noteCount}>
          {card.noteCount} {card.noteCount === 1 ? 'note' : 'notes'}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

interface HomeViewProps {
  pages: PageWithSections[];
  notes: Note[];
  loading: boolean;
  zoomLevel: number;
  onNavigate: (pageId: string | null, sectionId: string | null) => void;
  onRefresh: () => void;
  bottomInset: number;
}

export default function HomeView({
  pages,
  notes,
  loading,
  zoomLevel,
  onNavigate,
  onRefresh,
  bottomInset,
}: HomeViewProps) {
  const config = ZOOM_CONFIG[Math.min(zoomLevel, ZOOM_CONFIG.length - 1)];
  const cardWidth = config.columns === 1
    ? GRID_WIDTH
    : (GRID_WIDTH - CARD_GAP) / 2;

  const pageCards = useMemo(() => {
    // Build sectionId -> pageId lookup
    const sectionToPage: Record<string, string> = {};
    for (const page of pages) {
      for (const section of page.sections) {
        sectionToPage[section.id] = page.id;
      }
    }

    // Group notes by page
    const notesByPage: Record<string, Note[]> = {};
    for (const note of notes) {
      const pageId = sectionToPage[note.section_id];
      if (!pageId) continue;
      if (!notesByPage[pageId]) notesByPage[pageId] = [];
      notesByPage[pageId].push(note);
    }

    // Build card data for each page
    const cards: PageCardData[] = pages.map((page) => {
      const pageNotes = notesByPage[page.id] || [];
      // Sort by most recent for previews
      const sorted = [...pageNotes].sort((a, b) =>
        b.updated_at.localeCompare(a.updated_at),
      );

      const previewBarWidths = sorted
        .slice(0, 4)
        .map((n) => Math.min(95, Math.max(30, (n.content.length / 80) * 95)));

      const previewNoteTexts = sorted
        .slice(0, 6)
        .map((n) => n.content.replace(/\n/g, ' ').substring(0, 120));

      return {
        pageId: page.id,
        pageName: page.name,
        noteCount: pageNotes.length,
        starred: page.starred || false,
        previewBarWidths,
        previewNoteTexts,
      };
    });

    // Sort: starred first, then by note count descending
    cards.sort((a, b) => {
      if (a.starred !== b.starred) return a.starred ? -1 : 1;
      return b.noteCount - a.noteCount;
    });

    return cards;
  }, [pages, notes]);

  const handleCardPress = useCallback((pageId: string) => {
    onNavigate(pageId, null);
  }, [onNavigate]);

  if (pageCards.length === 0) {
    return (
      <ScrollView
        contentContainerStyle={styles.emptyList}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={onRefresh}
            tintColor={staticColors.textMuted}
          />
        }
      >
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No pages yet</Text>
          <Text style={styles.emptySubtitle}>
            Use the chat to create your first page
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.list, { paddingBottom: 180 + bottomInset }]}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={onRefresh}
          tintColor={staticColors.textMuted}
        />
      }
      showsVerticalScrollIndicator={false}
      keyboardDismissMode="on-drag"
    >
      <View style={styles.grid}>
        {pageCards.map((card) => (
          <PageCard
            key={card.pageId}
            card={card}
            cardWidth={cardWidth}
            noteLines={config.noteLines}
            onPress={handleCardPress}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 16,
  },
  emptyList: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
  },
  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: staticColors.border,
    backgroundColor: staticColors.surface,
    padding: 14,
    minHeight: 120,
    justifyContent: 'space-between',
  },
  cardPressed: {
    borderColor: staticColors.primary,
  },
  cardTitle: {
    fontFamily: theme.fonts.semibold,
    fontSize: 11,
    color: staticColors.primary,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  previewContainer: {
    gap: 6,
    flex: 1,
    justifyContent: 'flex-start',
  },
  previewBar: {
    height: 3,
    backgroundColor: staticColors.textMuted,
    opacity: 0.25,
    borderRadius: 1.5,
  },
  notePreviewText: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: staticColors.textMuted,
    lineHeight: 18,
  },
  noteCount: {
    fontFamily: theme.fonts.regular,
    fontSize: 11,
    color: staticColors.textMuted,
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontFamily: theme.fonts.medium,
    fontSize: 18,
    color: staticColors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    color: staticColors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
});
