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
import { colors, theme } from '../styles';

export default function SignInScreen() {
  const { login, loading, error } = useAuthStore();

  const handleSignIn = async () => {
    await login();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo / Title */}
        <View style={styles.header}>
          <Text style={styles.title}>Slate</Text>
          <Text style={styles.subtitle}>Your ideas, organized.</Text>
        </View>

        {/* Error message */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Sign in button */}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSignIn}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={styles.buttonText}>Sign in with Google</Text>
          )}
        </TouchableOpacity>

        {/* Footer */}
        <Text style={styles.footer}>
          Built for operators.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl * 2,
  },
  title: {
    fontSize: theme.fontSize.title,
    fontWeight: theme.fontWeight.bold,
    color: colors.primary,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.fontSize.lg,
    color: colors.textSecondary,
  },
  errorContainer: {
    backgroundColor: colors.error + '20',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
  },
  errorText: {
    color: colors.error,
    fontSize: theme.fontSize.sm,
    textAlign: 'center',
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.none,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.background,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
  },
  footer: {
    position: 'absolute',
    bottom: theme.spacing.xl,
    color: colors.textMuted,
    fontSize: theme.fontSize.sm,
  },
});
