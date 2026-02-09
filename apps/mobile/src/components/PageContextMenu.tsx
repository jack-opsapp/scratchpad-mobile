import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Edit3, Star, Share2, LogOut } from 'lucide-react-native';
import { colors, theme } from '../styles';

const HEADER_HEIGHT = 56;

interface PageContextMenuProps {
  visible: boolean;
  onClose: () => void;
  onRename: () => void;
  onToggleStar: () => void;
  onShare?: () => void;
  onLeavePage?: () => void;
  isStarred: boolean;
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
  isStarred,
  isSharedPage,
  pageName,
}: PageContextMenuProps) {
  const insets = useSafeAreaInsets();

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
          <Edit3 size={16} color={colors.textMuted} />
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
            <Share2 size={16} color={colors.textMuted} />
            <Text style={styles.menuText}>Share page</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={isSharedPage && onLeavePage ? styles.menuItem : styles.menuItemLast}
          onPress={onToggleStar}
          activeOpacity={0.7}
        >
          <Star
            size={16}
            color={isStarred ? colors.primary : colors.textMuted}
            fill={isStarred ? colors.primary : 'none'}
          />
          <Text style={styles.menuText}>
            {isStarred ? 'Unstar page' : 'Star page'}
          </Text>
        </TouchableOpacity>

        {isSharedPage && onLeavePage && (
          <TouchableOpacity
            style={styles.menuItemLast}
            onPress={onLeavePage}
            activeOpacity={0.7}
          >
            <LogOut size={16} color={colors.danger} />
            <Text style={[styles.menuText, { color: colors.danger }]}>Leave page</Text>
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
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
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
    borderBottomColor: colors.border,
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
    color: colors.textPrimary,
  },
});
