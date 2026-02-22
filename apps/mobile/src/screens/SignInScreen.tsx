import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../stores/authStore';
import { colors as staticColors, theme } from '../styles';

export default function SignInScreen() {
  const { login, loading, error } = useAuthStore();

  const handleAppleSignIn = async () => {
    await login('apple');
  };

  const handleGoogleSignIn = async () => {
    await login('google');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo / Title */}
        <View style={styles.header}>
          <Text style={styles.title}>SLATE</Text>
          <Text style={styles.subtitle}>Your ideas, organized.</Text>
        </View>

        {/* Error message */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Sign in buttons */}
        <View style={styles.buttonGroup}>
          {/* Apple button — prominent per Apple HIG */}
          <TouchableOpacity
            style={[styles.appleButton, loading && styles.buttonDisabled]}
            onPress={handleAppleSignIn}
            disabled={loading}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator color="#000000" size="small" />
            ) : (
              <Text style={styles.appleButtonText}>SIGN IN WITH APPLE</Text>
            )}
          </TouchableOpacity>

          {/* Google button — outline style */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleGoogleSignIn}
            disabled={loading}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator color={staticColors.textPrimary} size="small" />
            ) : (
              <Text style={styles.buttonText}>SIGN IN WITH GOOGLE</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>Built for operators.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: staticColors.bg,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing[12],
  },
  title: {
    fontFamily: theme.fonts.semibold,
    fontSize: theme.fontSize['3xl'],
    color: staticColors.textPrimary,
    letterSpacing: 4,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSize.md,
    color: staticColors.textMuted,
    letterSpacing: 0.5,
  },
  errorContainer: {
    borderWidth: 1,
    borderColor: staticColors.danger,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  errorText: {
    fontFamily: theme.fonts.regular,
    color: staticColors.danger,
    fontSize: theme.fontSize.sm,
    textAlign: 'center',
  },
  buttonGroup: {
    gap: 12,
    width: '100%',
    maxWidth: 280,
  },
  appleButton: {
    backgroundColor: '#ffffff',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    alignItems: 'center',
  },
  appleButtonText: {
    fontFamily: theme.fonts.medium,
    color: '#000000',
    fontSize: theme.fontSize.sm,
    letterSpacing: 1.5,
  },
  button: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: staticColors.border,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontFamily: theme.fonts.medium,
    color: staticColors.textPrimary,
    fontSize: theme.fontSize.sm,
    letterSpacing: 1.5,
  },
  footer: {
    position: 'absolute',
    bottom: theme.spacing.xl,
    fontFamily: theme.fonts.regular,
    color: staticColors.textMuted,
    fontSize: theme.fontSize.xs,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
