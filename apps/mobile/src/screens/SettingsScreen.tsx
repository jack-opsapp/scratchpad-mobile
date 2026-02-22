import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogOut, User } from 'lucide-react-native';
import { useAuthStore } from '../stores/authStore';
import { colors as staticColors, theme } from '../styles';

export default function SettingsScreen() {
  const { user, logout } = useAuthStore();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SETTINGS</Text>
      </View>

      <View style={styles.content}>
        {/* User info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACCOUNT</Text>
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <User size={16} color={staticColors.textMuted} />
              <View style={styles.cardContent}>
                <Text style={styles.label}>Email</Text>
                <Text style={styles.value}>{user?.email || 'Not signed in'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* App info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>APP</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Version</Text>
              <Text style={styles.infoValue}>1.0.0</Text>
            </View>
          </View>
        </View>

        {/* Sign out */}
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={logout}
          activeOpacity={0.7}
        >
          <LogOut size={16} color={staticColors.danger} />
          <Text style={styles.signOutText}>SIGN OUT</Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>SLATE</Text>
        <Text style={styles.footerSubtext}>Built for operators.</Text>
      </View>
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
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: staticColors.border,
  },
  headerTitle: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.medium,
    color: staticColors.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  content: {
    flex: 1,
    padding: theme.spacing.md,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.medium,
    color: staticColors.textMuted,
    letterSpacing: 1.5,
    marginBottom: theme.spacing.sm,
  },
  card: {
    backgroundColor: staticColors.surface,
    borderWidth: 1,
    borderColor: staticColors.border,
    padding: theme.spacing.md,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardContent: {
    marginLeft: theme.spacing.sm,
  },
  label: {
    fontSize: theme.fontSize.sm,
    color: staticColors.textMuted,
    marginBottom: 2,
  },
  value: {
    fontSize: theme.fontSize.base,
    color: staticColors.textPrimary,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoValue: {
    fontSize: theme.fontSize.base,
    color: staticColors.textMuted,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    borderWidth: 1,
    borderColor: staticColors.border,
    marginTop: theme.spacing.md,
  },
  signOutText: {
    color: staticColors.danger,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.medium,
    letterSpacing: 1.5,
    marginLeft: theme.spacing.sm,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
  },
  footerText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: staticColors.textMuted,
    letterSpacing: 2,
    marginBottom: theme.spacing.xs,
  },
  footerSubtext: {
    fontSize: theme.fontSize.xs,
    color: staticColors.textMuted,
  },
});
