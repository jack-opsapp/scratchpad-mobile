import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Pressable,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { X, ChevronDown, ChevronRight, Star, Settings, Users, Home } from 'lucide-react-native';
import { colors as staticColors, theme } from '../styles';
import { useTheme } from '../contexts/ThemeContext';
import { useDataStore } from '../stores/dataStore';
import { useAuthStore } from '../stores/authStore';
import type { PageWithSections } from '@slate/shared';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = 50;

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (pageId: string | null, sectionId: string | null) => void;
  onSettingsPress?: () => void;
  currentPageId?: string | null;
  currentSectionId?: string | null;
}

export default function MobileSidebar({
  isOpen,
  onClose,
  onNavigate,
  onSettingsPress,
  currentPageId,
  currentSectionId,
}: MobileSidebarProps) {
  const insets = useSafeAreaInsets();
  const colors = useTheme();
  const { pages, sharedPages, tags } = useDataStore();
  const { user } = useAuthStore();

  const translateX = useSharedValue(-SCREEN_WIDTH);
  const overlayOpacity = useSharedValue(0);

  const [expandedPages, setExpandedPages] = React.useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      setExpandedPages(new Set()); // Collapse all pages on open
      translateX.value = withTiming(0, { duration: 300 });
      overlayOpacity.value = withTiming(0.5, { duration: 300 });
    } else {
      translateX.value = withTiming(-SCREEN_WIDTH, { duration: 300 });
      overlayOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [isOpen, translateX, overlayOpacity]);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationX < 0) {
        translateX.value = Math.max(-SCREEN_WIDTH, event.translationX);
        overlayOpacity.value = interpolate(
          translateX.value,
          [-SCREEN_WIDTH, 0],
          [0, 0.5],
          Extrapolation.CLAMP
        );
      }
    })
    .onEnd((event) => {
      if (event.translationX < -SWIPE_THRESHOLD * 2 || event.velocityX < -500) {
        translateX.value = withTiming(-SCREEN_WIDTH, { duration: 300 });
        overlayOpacity.value = withTiming(0, { duration: 300 });
        runOnJS(onClose)();
      } else {
        translateX.value = withTiming(0, { duration: 300 });
        overlayOpacity.value = withTiming(0.5, { duration: 300 });
      }
    });

  const sidebarStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
    pointerEvents: overlayOpacity.value > 0 ? 'auto' as const : 'none' as const,
  }));

  const togglePage = (pageId: string) => {
    setExpandedPages((prev) => {
      const next = new Set(prev);
      if (next.has(pageId)) {
        next.delete(pageId);
      } else {
        next.add(pageId);
      }
      return next;
    });
  };

  const handleNavigate = (pageId: string | null, sectionId: string | null) => {
    onNavigate(pageId, sectionId);
    onClose();
  };

  const getUserInitials = () => {
    if (!user) return '?';
    const name = user.user_metadata?.full_name;
    if (name) {
      return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return (user.email || '?')[0].toUpperCase();
  };

  if (!isOpen && translateX.value === -SCREEN_WIDTH) {
    return null;
  }

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 1000 }]} pointerEvents={isOpen ? 'auto' : 'none'}>
      {/* Overlay */}
      <Animated.View style={[styles.overlay, overlayStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Full-screen Drawer */}
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            styles.sidebar,
            sidebarStyle,
            { paddingTop: insets.top },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.logo, { color: '#ffffff' }]}>SLATE</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <X size={24} color={staticColors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Scrollable content */}
          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Home */}
            <View style={styles.section}>
              <TouchableOpacity
                style={[
                  styles.pageItem,
                  !currentPageId && styles.pageItemActive,
                ]}
                onPress={() => handleNavigate(null, null)}
                activeOpacity={0.7}
              >
                <Home size={18} color={!currentPageId ? staticColors.textPrimary : staticColors.textMuted} />
                <Text style={[styles.pageName, !currentPageId && { color: staticColors.textPrimary }]}>
                  HOME
                </Text>
              </TouchableOpacity>
            </View>

            {/* My Pages */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>MY PAGES</Text>
              {pages.map((page) => {
                const isExpanded = expandedPages.has(page.id);
                const hasSections = page.sections && page.sections.length > 0;
                const isCurrentPage = currentPageId === page.id;

                return (
                  <View key={page.id} style={styles.pageContainer}>
                    <TouchableOpacity
                      style={[
                        styles.pageItem,
                        isCurrentPage && styles.pageItemActive,
                      ]}
                      onPress={() => {
                        if (hasSections) {
                          togglePage(page.id);
                        } else {
                          handleNavigate(page.id, null);
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      {hasSections ? (
                        isExpanded ? (
                          <ChevronDown size={18} color={staticColors.textMuted} />
                        ) : (
                          <ChevronRight size={18} color={staticColors.textMuted} />
                        )
                      ) : (
                        <View style={{ width: 18 }} />
                      )}
                      {page.starred && (
                        <Star size={14} color={colors.primary} fill={colors.primary} />
                      )}
                      <Text style={styles.pageName} numberOfLines={1}>
                        {page.name.toUpperCase()}
                      </Text>
                    </TouchableOpacity>

                    {/* Sections - collapsible */}
                    {hasSections && isExpanded && (
                      <View style={styles.sectionsContainer}>
                        <TouchableOpacity
                          style={[
                            styles.sectionItem,
                            isCurrentPage && !currentSectionId && styles.sectionItemActive,
                          ]}
                          onPress={() => handleNavigate(page.id, null)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.sectionName,
                              isCurrentPage && !currentSectionId && styles.sectionNameActive,
                            ]}
                          >
                            ALL SECTIONS
                          </Text>
                        </TouchableOpacity>
                        {page.sections.map((section) => (
                          <TouchableOpacity
                            key={section.id}
                            style={[
                              styles.sectionItem,
                              currentSectionId === section.id && styles.sectionItemActive,
                            ]}
                            onPress={() => handleNavigate(page.id, section.id)}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.sectionName,
                                currentSectionId === section.id && styles.sectionNameActive,
                              ]}
                            >
                              {section.name.toUpperCase()}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Shared With Me */}
            {sharedPages.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sharedLabelRow}>
                  <Users size={14} color={staticColors.textMuted} />
                  <Text style={[styles.sectionLabel, { marginBottom: 0 }]}>SHARED WITH ME</Text>
                </View>
                {sharedPages.map((page) => {
                  const isExpanded = expandedPages.has(page.id);
                  const hasSections = page.sections && page.sections.length > 0;
                  const isCurrentPage = currentPageId === page.id;
                  const isPending = page.permissionStatus === 'pending';

                  return (
                    <View key={page.id} style={styles.pageContainer}>
                      <TouchableOpacity
                        style={[
                          styles.pageItem,
                          isCurrentPage && styles.pageItemActive,
                        ]}
                        onPress={() => {
                          if (hasSections) {
                            togglePage(page.id);
                          } else {
                            handleNavigate(page.id, null);
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        {hasSections ? (
                          isExpanded ? (
                            <ChevronDown size={18} color={staticColors.textMuted} />
                          ) : (
                            <ChevronRight size={18} color={staticColors.textMuted} />
                          )
                        ) : (
                          <View style={{ width: 18 }} />
                        )}
                        <Text style={styles.pageName} numberOfLines={1}>
                          {page.name.toUpperCase()}
                        </Text>
                        {isPending && (
                          <View style={[styles.newBadge, { backgroundColor: colors.primary }]}>
                            <Text style={styles.newBadgeText}>NEW</Text>
                          </View>
                        )}
                      </TouchableOpacity>

                      {/* Sections - collapsible */}
                      {hasSections && isExpanded && (
                        <View style={styles.sectionsContainer}>
                          <TouchableOpacity
                            style={[
                              styles.sectionItem,
                              isCurrentPage && !currentSectionId && styles.sectionItemActive,
                            ]}
                            onPress={() => handleNavigate(page.id, null)}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.sectionName,
                                isCurrentPage && !currentSectionId && styles.sectionNameActive,
                              ]}
                            >
                              ALL SECTIONS
                            </Text>
                          </TouchableOpacity>
                          {page.sections.map((section) => (
                            <TouchableOpacity
                              key={section.id}
                              style={[
                                styles.sectionItem,
                                currentSectionId === section.id && styles.sectionItemActive,
                              ]}
                              onPress={() => handleNavigate(page.id, section.id)}
                              activeOpacity={0.7}
                            >
                              <Text
                                style={[
                                  styles.sectionName,
                                  currentSectionId === section.id && styles.sectionNameActive,
                                ]}
                              >
                                {section.name.toUpperCase()}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
            {/* Tags */}
            {tags.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>TAGS</Text>
                <View style={styles.tagsContainer}>
                  {tags.map((tag) => (
                    <View key={tag} style={styles.tagPill}>
                      <Text style={styles.tagPillText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
            {/* Settings button */}
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={onSettingsPress}
              activeOpacity={0.7}
            >
              <Settings size={18} color={staticColors.textMuted} />
              <Text style={styles.settingsText}>SETTINGS</Text>
            </TouchableOpacity>

            {/* User info */}
            {user && (
              <TouchableOpacity
                style={styles.userRow}
                onPress={onSettingsPress}
                activeOpacity={0.7}
              >
                <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                  <Text style={styles.avatarText}>{getUserInitials()}</Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName} numberOfLines={1}>
                    {user.user_metadata?.full_name || user.email}
                  </Text>
                  {user.user_metadata?.full_name && (
                    <Text style={styles.userEmail} numberOfLines={1}>
                      {user.email}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: SCREEN_WIDTH,
    backgroundColor: staticColors.bg,
    flexDirection: 'column',
  },
  header: {
    padding: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: staticColors.border,
  },
  logo: {
    fontFamily: theme.fonts.semibold,
    fontSize: 18,
    letterSpacing: -0.5,
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContainer: {
    paddingVertical: 16,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionLabel: {
    fontFamily: theme.fonts.semibold,
    fontSize: 11,
    color: staticColors.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  sharedLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  newBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  newBadgeText: {
    fontFamily: theme.fonts.semibold,
    fontSize: 9,
    color: staticColors.bg,
    letterSpacing: 0.5,
  },
  pageContainer: {
    marginBottom: 4,
  },
  pageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
    borderRadius: 8,
  },
  pageItemActive: {
    backgroundColor: staticColors.surface,
  },
  pageName: {
    fontFamily: theme.fonts.regular,
    fontSize: 16,
    color: staticColors.textPrimary,
    flex: 1,
  },
  sectionsContainer: {
    marginLeft: 30,
    borderLeftWidth: 1,
    borderLeftColor: staticColors.border,
    paddingLeft: 12,
    marginTop: 4,
  },
  sectionItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  sectionItemActive: {
    backgroundColor: staticColors.surface,
  },
  sectionName: {
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    color: staticColors.textMuted,
  },
  sectionNameActive: {
    color: staticColors.textPrimary,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagPill: {
    borderWidth: 1,
    borderColor: staticColors.border,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 4,
  },
  tagPillText: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: staticColors.textMuted,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: staticColors.border,
  },
  settingsText: {
    fontFamily: theme.fonts.semibold,
    fontSize: 11,
    color: staticColors.textMuted,
    letterSpacing: 1.5,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontFamily: theme.fonts.semibold,
    fontSize: 14,
    color: staticColors.bg,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontFamily: theme.fonts.medium,
    fontSize: 14,
    color: staticColors.textPrimary,
  },
  userEmail: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: staticColors.textMuted,
    marginTop: 2,
  },
});
