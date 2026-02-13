import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Edit3, Star, Share2, LogOut, Home } from 'lucide-react-native';
import { colors as staticColors, theme } from '../styles';
import { useTheme } from '../contexts/ThemeContext';

const HEADER_HEIGHT = 56;

interface PageContextMenuProps {
  visible: boolean;
  onClose: () => void;
  onRename: () => void;
  onToggleStar: () => void;
  onShare?: () => void;
  onLeavePage?: () => void;
  onSetDefault?: () => void;
  onClearDefault?: () => void;
  isStarred: boolean;
  isDefault?: boolean;
  isSharedPage?: boolean;
  pageName?: string;
}

export default function PageContextMenu({
  visible,
  onClose,
  onRename,
  onToggleStar,
  onShare,
  onLeavePage,
  onSetDefault,
  onClearDefault,
  isStarred,
  isDefault,
  isSharedPage,
  pageName,
}: PageContextMenuProps) {
  const insets = useSafeAreaInsets();
  const colors = useTheme();

  if (!visible) return null;

  return (
    <>
      {/* Invisible backdrop to catch taps outside */}
      <Pressable style={styles.backdrop} onPress={onClose} />

      {/* Menu dropdown - positioned below header */}
      <View style={[styles.menu, { top: insets.top + HEADER_HEIGHT }]}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={onRename}
          activeOpacity={0.7}
        >
          <Edit3 size={16} color={staticColors.textMuted} />
          <Text style={styles.menuText}>Rename</Text>
        </TouchableOpacity>

        {onShare && (
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              onShare();
              onClose();
            }}
            activeOpacity={0.7}
          >
            <Share2 size={16} color={staticColors.textMuted} />
            <Text style={styles.menuText}>Share page</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.menuItem}
          onPress={onToggleStar}
          activeOpacity={0.7}
        >
          <Star
            size={16}
            color={isStarred ? colors.primary : staticColors.textMuted}
            fill={isStarred ? colors.primary : 'none'}
          />
          <Text style={styles.menuText}>
            {isStarred ? 'Unstar page' : 'Star page'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={isSharedPage && onLeavePage ? styles.menuItem : styles.menuItemLast}
          onPress={() => {
            if (isDefault) {
              onClearDefault?.();
            } else {
              onSetDefault?.();
            }
            onClose();
          }}
          activeOpacity={0.7}
        >
          <Home
            size={16}
            color={isDefault ? colors.primary : staticColors.textMuted}
            fill={isDefault ? colors.primary : 'none'}
          />
          <Text style={styles.menuText}>
            {isDefault ? 'Clear default' : 'Set as default'}
          </Text>
        </TouchableOpacity>

        {isSharedPage && onLeavePage && (
          <TouchableOpacity
            style={styles.menuItemLast}
            onPress={onLeavePage}
            activeOpacity={0.7}
          >
            <LogOut size={16} color={staticColors.danger} />
            <Text style={[styles.menuText, { color: staticColors.danger }]}>Leave page</Text>
          </TouchableOpacity>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 800,
  },
  menu: {
    position: 'absolute',
    right: 8,
    backgroundColor: staticColors.surface,
    borderWidth: 1,
    borderColor: staticColors.border,
    zIndex: 810,
    minWidth: 180,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: staticColors.border,
  },
  menuItemLast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuText: {
    fontFamily: theme.fonts.regular,
    fontSize: 15,
    color: staticColors.textPrimary,
  },
});
