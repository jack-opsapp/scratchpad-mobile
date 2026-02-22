import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { PermissionRole } from '@slate/shared';
import { colors as staticColors, theme } from '../styles';
import { useTheme } from '../contexts/ThemeContext';

interface SharedPageBannerProps {
  role: PermissionRole;
  ownerEmail: string;
  onAccept: () => void;
  onDecline: () => void;
}

export default function SharedPageBanner({
  role,
  ownerEmail,
  onAccept,
  onDecline,
}: SharedPageBannerProps) {
  const colors = useTheme();
  const roleLabel = role.replace('-', ' ').toUpperCase();

  return (
    <View style={styles.container}>
      <Text style={styles.sharedText}>
        {ownerEmail} shared this page
      </Text>
      <View style={styles.actionsRow}>
        <View style={[styles.roleBadge, { borderColor: colors.primary }]}>
          <Text style={[styles.roleText, { color: colors.primary }]}>{roleLabel}</Text>
        </View>
        <View style={styles.buttons}>
          <TouchableOpacity
            style={[styles.acceptButton, { backgroundColor: colors.primary }]}
            onPress={onAccept}
            activeOpacity={0.7}
          >
            <Text style={styles.acceptText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.declineButton}
            onPress={onDecline}
            activeOpacity={0.7}
          >
            <Text style={styles.declineText}>Decline</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: staticColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: staticColors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  sharedText: {
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    color: staticColors.textSecondary,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  roleBadge: {
    borderWidth: 1,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  roleText: {
    fontFamily: theme.fonts.semibold,
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  buttons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 'auto',
  },
  acceptButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  acceptText: {
    fontFamily: theme.fonts.semibold,
    fontSize: 13,
    color: staticColors.bg,
  },
  declineButton: {
    borderWidth: 1,
    borderColor: staticColors.border,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  declineText: {
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    color: staticColors.textMuted,
  },
});
