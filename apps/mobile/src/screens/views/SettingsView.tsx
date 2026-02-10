import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LogOut, User, Info } from 'lucide-react-native';
import { useAuthStore } from '../../stores/authStore';
import { colors, theme } from '../../styles';

export default function SettingsView() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuthStore();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.contentContainer,
        { paddingBottom: Math.max(insets.bottom, 24) },
      ]}
    >
      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ACCOUNT</Text>
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <User size={16} color={colors.textMuted} />
            <View style={styles.cardContent}>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.value}>{user?.email || 'Not signed in'}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* App Info Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>APP</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <Info size={16} color={colors.textMuted} />
              <Text style={styles.infoLabel}>Version</Text>
            </View>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
        </View>
      </View>

      {/* Sign Out */}
      <TouchableOpacity
        style={styles.signOutButton}
        onPress={logout}
        activeOpacity={0.7}
      >
        <LogOut size={16} color={colors.danger} />
        <Text style={styles.signOutText}>SIGN OUT</Text>
      </TouchableOpacity>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerLogo}>SLATE</Text>
        <Text style={styles.footerTagline}>Built for operators.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: theme.fonts.medium,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardContent: {
    marginLeft: 12,
  },
  label: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 2,
  },
  value: {
    fontFamily: theme.fonts.regular,
    fontSize: 15,
    color: colors.textPrimary,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoLabel: {
    fontFamily: theme.fonts.regular,
    fontSize: 15,
    color: colors.textPrimary,
    marginLeft: 12,
  },
  infoValue: {
    fontFamily: theme.fonts.regular,
    fontSize: 15,
    color: colors.textMuted,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 8,
  },
  signOutText: {
    fontFamily: theme.fonts.medium,
    color: colors.danger,
    fontSize: 12,
    letterSpacing: 1.5,
    marginLeft: 10,
  },
  footer: {
    alignItems: 'center',
    marginTop: 48,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerLogo: {
    fontFamily: theme.fonts.semibold,
    fontSize: 16,
    color: colors.textMuted,
    letterSpacing: 3,
    marginBottom: 6,
  },
  footerTagline: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
});
