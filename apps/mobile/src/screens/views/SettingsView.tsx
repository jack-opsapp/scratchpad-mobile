import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LogOut, User, Info } from 'lucide-react-native';
import { useAuthStore } from '../../stores/authStore';
import { colors as staticColors, theme } from '../../styles';

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
            <User size={16} color={staticColors.textMuted} />
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
              <Info size={16} color={staticColors.textMuted} />
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
        <LogOut size={16} color={staticColors.danger} />
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
    color: staticColors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  card: {
    backgroundColor: staticColors.surface,
    borderWidth: 1,
    borderColor: staticColors.border,
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
    color: staticColors.textMuted,
    marginBottom: 2,
  },
  value: {
    fontFamily: theme.fonts.regular,
    fontSize: 15,
    color: staticColors.textPrimary,
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
    color: staticColors.textPrimary,
    marginLeft: 12,
  },
  infoValue: {
    fontFamily: theme.fonts.regular,
    fontSize: 15,
    color: staticColors.textMuted,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: staticColors.border,
    marginTop: 8,
  },
  signOutText: {
    fontFamily: theme.fonts.medium,
    color: staticColors.danger,
    fontSize: 12,
    letterSpacing: 1.5,
    marginLeft: 10,
  },
  footer: {
    alignItems: 'center',
    marginTop: 48,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
  },
  footerLogo: {
    fontFamily: theme.fonts.semibold,
    fontSize: 16,
    color: staticColors.textMuted,
    letterSpacing: 3,
    marginBottom: 6,
  },
  footerTagline: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: staticColors.textMuted,
  },
});
