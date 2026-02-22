import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MoreVertical, ChevronLeft, X } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { colors as staticColors, theme } from '../styles';

interface MobileHeaderProps {
  currentPage?: string;
  currentSection?: string;
  onMenuPress?: () => void;
  onMorePress?: () => void;
  onBackPress?: () => void;
  showBack?: boolean;
  isDrawerOpen?: boolean;
  agentViewTitle?: string | null;
  onCloseAgentView?: () => void;
}

/** Animated hamburger that morphs into an X */
function AnimatedHamburger({ isOpen }: { isOpen: boolean }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(isOpen ? 1 : 0, { duration: 300 });
  }, [isOpen, progress]);

  const topBarStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [0, 7]) },
      { rotate: `${interpolate(progress.value, [0, 1], [0, 45])}deg` },
    ],
  }));

  const middleBarStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.3], [1, 0]),
  }));

  const bottomBarStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [0, -7]) },
      { rotate: `${interpolate(progress.value, [0, 1], [0, -45])}deg` },
    ],
  }));

  return (
    <View style={styles.hamburgerContainer}>
      <Animated.View style={[styles.hamburgerBar, topBarStyle]} />
      <Animated.View style={[styles.hamburgerBar, middleBarStyle]} />
      <Animated.View style={[styles.hamburgerBar, bottomBarStyle]} />
    </View>
  );
}

export default function MobileHeader({
  currentPage,
  currentSection,
  onMenuPress,
  onMorePress,
  onBackPress,
  showBack = false,
  isDrawerOpen = false,
  agentViewTitle = null,
  onCloseAgentView,
}: MobileHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={staticColors.surface} />
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.content}>
          {/* Left button - Animated Hamburger/X or Back */}
          {showBack ? (
            <TouchableOpacity
              style={styles.button}
              onPress={onBackPress}
              activeOpacity={0.7}
            >
              <ChevronLeft size={24} color={staticColors.textMuted} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.button}
              onPress={onMenuPress}
              activeOpacity={0.7}
            >
              <AnimatedHamburger isOpen={isDrawerOpen} />
            </TouchableOpacity>
          )}

          {/* Breadcrumb - left aligned */}
          <View style={styles.breadcrumb}>
            {agentViewTitle ? (
              <Text style={styles.breadcrumbText} numberOfLines={1}>
                <Text style={styles.breadcrumbMuted}>AGENT / </Text>
                {agentViewTitle}
              </Text>
            ) : (
              <Text style={styles.breadcrumbText} numberOfLines={1}>
                {(currentPage || 'Slate').toUpperCase()}
                {currentSection && (
                  <Text style={styles.breadcrumbMuted}>
                    {' / '}{currentSection.toUpperCase()}
                  </Text>
                )}
              </Text>
            )}
          </View>

          {/* Right button */}
          {agentViewTitle && onCloseAgentView ? (
            <TouchableOpacity
              style={styles.button}
              onPress={onCloseAgentView}
              activeOpacity={0.7}
            >
              <X size={18} color={staticColors.textMuted} />
            </TouchableOpacity>
          ) : !agentViewTitle ? (
            <TouchableOpacity
              style={styles.button}
              onPress={onMorePress}
              activeOpacity={0.7}
            >
              <MoreVertical size={20} color={staticColors.textMuted} />
            </TouchableOpacity>
          ) : (
            <View style={styles.button} />
          )}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: staticColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: staticColors.border,
    zIndex: 100,
  },
  content: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 4,
  },
  button: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  breadcrumb: {
    flex: 1,
    paddingLeft: 4,
  },
  breadcrumbText: {
    fontFamily: theme.fonts.semibold,
    fontSize: 15,
    color: staticColors.textPrimary,
  },
  breadcrumbMuted: {
    fontFamily: theme.fonts.regular,
    color: staticColors.textMuted,
    fontWeight: '400',
  },
  hamburgerContainer: {
    width: 22,
    height: 16,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hamburgerBar: {
    width: 18,
    height: 2,
    backgroundColor: staticColors.textMuted,
    borderRadius: 1,
  },
});
