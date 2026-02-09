import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { PermissionRole } from '@slate/shared';
import { colors, theme } from '../styles';

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
  const roleLabel = role.replace('-', ' ').toUpperCase();

  return (
    <View style={styles.container}>
      <Text style={styles.sharedText}>
        {ownerEmail} shared this page
      </Text>
      <View style={styles.actionsRow}>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{roleLabel}</Text>
        </View>
        <View style={styles.buttons}>
          <TouchableOpacity
            style={styles.acceptButton}
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
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  sharedText: {
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  roleBadge: {
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  roleText: {
    fontFamily: theme.fonts.semibold,
    fontSize: 10,
    color: colors.primary,
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
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  acceptText: {
    fontFamily: theme.fonts.semibold,
    fontSize: 13,
    color: colors.bg,
  },
  declineButton: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  declineText: {
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
});
