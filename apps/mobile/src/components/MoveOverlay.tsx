import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { colors as staticColors, theme } from '../styles';
import { useTheme } from '../contexts/ThemeContext';
import type { PageWithSections } from '@slate/shared';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PANEL_WIDTH = SCREEN_WIDTH * 0.55;

interface DropTarget {
  sectionId: string;
  pageName: string;
  sectionName: string;
  y: number;
  height: number;
}

interface MoveOverlayProps {
  visible: boolean;
  pages: PageWithSections[];
  dragX: number;
  dragY: number;
  noteContent: string;
  onTargetsReady?: (targets: DropTarget[]) => void;
}

export type { DropTarget };

export default function MoveOverlay({
  visible,
  pages,
  dragX,
  dragY,
  noteContent,
  onTargetsReady,
}: MoveOverlayProps) {
  const colors = useTheme();
  const translateX = useSharedValue(SCREEN_WIDTH);
  const overlayOpacity = useSharedValue(0);
  const targetsRef = useRef<DropTarget[]>([]);
  const sectionRefs = useRef<Map<string, View>>(new Map());
  const measureTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (visible) {
      translateX.value = withTiming(SCREEN_WIDTH - PANEL_WIDTH, { duration: 250 });
      overlayOpacity.value = withTiming(0.4, { duration: 250 });
      // Measure targets after panel slides in
      measureTimeoutRef.current = setTimeout(measureAllTargets, 300);
    } else {
      translateX.value = withTiming(SCREEN_WIDTH, { duration: 200 });
      overlayOpacity.value = withTiming(0, { duration: 200 });
      targetsRef.current = [];
    }
    return () => {
      if (measureTimeoutRef.current) clearTimeout(measureTimeoutRef.current);
    };
  }, [visible, translateX, overlayOpacity]);

  const measureAllTargets = useCallback(() => {
    const newTargets: DropTarget[] = [];
    const entries = Array.from(sectionRefs.current.entries());
    let measured = 0;

    entries.forEach(([key, ref]) => {
      ref.measureInWindow((x, y, width, height) => {
        const [sectionId, pageName, sectionName] = key.split('|||');
        newTargets.push({ sectionId, pageName, sectionName, y, height });
        measured++;
        if (measured === entries.length) {
          targetsRef.current = newTargets;
          onTargetsReady?.(newTargets);
        }
      });
    });
  }, [onTargetsReady]);

  const setSectionRef = useCallback(
    (sectionId: string, pageName: string, sectionName: string) =>
      (ref: View | null) => {
        const key = `${sectionId}|||${pageName}|||${sectionName}`;
        if (ref) {
          sectionRefs.current.set(key, ref);
        } else {
          sectionRefs.current.delete(key);
        }
      },
    [],
  );

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  // Determine which target is hovered
  const isHovered = (sectionId: string): boolean => {
    if (!visible || dragX < SCREEN_WIDTH - PANEL_WIDTH) return false;
    const target = targetsRef.current.find((t) => t.sectionId === sectionId);
    if (!target) return false;
    return dragY >= target.y && dragY <= target.y + target.height;
  };

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Dark overlay on left side */}
      <Animated.View style={[styles.overlay, overlayStyle]} />

      {/* Floating note preview following finger */}
      {noteContent && dragY > 0 && (
        <View
          style={[
            styles.floatingNote,
            {
              left: Math.max(12, Math.min(dragX - 100, SCREEN_WIDTH - PANEL_WIDTH - 220)),
              top: dragY - 24,
            },
          ]}
        >
          <Text style={styles.floatingNoteText} numberOfLines={1}>
            {noteContent}
          </Text>
        </View>
      )}

      {/* Side panel */}
      <Animated.View style={[styles.panel, panelStyle]}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>MOVE TO</Text>
        </View>
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {pages.map((page) => (
            <View key={page.id} style={styles.pageGroup}>
              <Text style={styles.pageName}>{page.name}</Text>
              {page.sections.map((section) => (
                <View
                  key={section.id}
                  ref={setSectionRef(section.id, page.name, section.name)}
                  style={[
                    styles.sectionTarget,
                    isHovered(section.id) && { borderColor: colors.primary, backgroundColor: 'rgba(209, 177, 143, 0.1)' },
                  ]}
                >
                  <View
                    style={[
                      styles.sectionDot,
                      isHovered(section.id) && { backgroundColor: colors.primary },
                    ]}
                  />
                  <Text
                    style={[
                      styles.sectionName,
                      isHovered(section.id) && { color: colors.primary },
                    ]}
                    numberOfLines={1}
                  >
                    {section.name}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  floatingNote: {
    position: 'absolute',
    width: 200,
    backgroundColor: staticColors.surface,
    borderWidth: 1,
    borderColor: staticColors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    zIndex: 10,
    shadowColor: staticColors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  floatingNoteText: {
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    color: staticColors.textPrimary,
  },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: PANEL_WIDTH,
    backgroundColor: staticColors.surface,
    borderLeftWidth: 1,
    borderLeftColor: staticColors.border,
  },
  panelHeader: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: staticColors.border,
  },
  panelTitle: {
    fontFamily: theme.fonts.semibold,
    fontSize: 11,
    color: staticColors.textMuted,
    letterSpacing: 1.5,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 12,
  },
  pageGroup: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  pageName: {
    fontFamily: theme.fonts.semibold,
    fontSize: 14,
    color: staticColors.textPrimary,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionTarget: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 2,
  },
  sectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: staticColors.border,
  },
  sectionName: {
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    color: staticColors.textMuted,
    flex: 1,
  },
});
