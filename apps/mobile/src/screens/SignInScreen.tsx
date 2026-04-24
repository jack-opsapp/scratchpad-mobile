import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../stores/authStore';
import { colors as staticColors, theme } from '../styles';

export default function SignInScreen() {
  const { login, loginWithEmail, signUpWithEmail, loading, error } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const handleEmailSubmit = async () => {
    if (!email.trim() || !password.trim()) return;

    if (isSignUp) {
      const result = await signUpWithEmail(email.trim(), password);
      if (result === 'confirmation') {
        setConfirmationSent(true);
      }
    } else {
      await loginWithEmail(email.trim(), password);
    }
  };

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

        {/* Confirmation message */}
        {confirmationSent && (
          <View style={styles.confirmationContainer}>
            <Text style={styles.confirmationText}>
              Check your email to confirm your account.
            </Text>
          </View>
        )}

        {/* Email / Password form */}
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={staticColors.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            editable={!loading}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={staticColors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType={isSignUp ? 'newPassword' : 'password'}
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.emailButton, loading && styles.buttonDisabled]}
            onPress={handleEmailSubmit}
            disabled={loading || !email.trim() || !password.trim()}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator color="#000000" size="small" />
            ) : (
              <Text style={styles.emailButtonText}>
                {isSignUp ? 'SIGN UP' : 'SIGN IN'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setIsSignUp(!isSignUp)}
            activeOpacity={0.7}
          >
            <Text style={styles.toggleText}>
              {isSignUp
                ? 'Already have an account? Sign In'
                : "Don't have an account? Sign Up"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* OAuth buttons */}
        <View style={styles.buttonGroup}>
          {/* Apple button */}
          <TouchableOpacity
            style={[styles.appleButton, loading && styles.buttonDisabled]}
            onPress={handleAppleSignIn}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Text style={styles.appleButtonText}>SIGN IN WITH APPLE</Text>
          </TouchableOpacity>

          {/* Google button */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleGoogleSignIn}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonText}>SIGN IN WITH GOOGLE</Text>
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
  confirmationContainer: {
    borderWidth: 1,
    borderColor: staticColors.success,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  confirmationText: {
    fontFamily: theme.fonts.regular,
    color: staticColors.success,
    fontSize: theme.fontSize.sm,
    textAlign: 'center',
  },
  errorText: {
    fontFamily: theme.fonts.regular,
    color: staticColors.danger,
    fontSize: theme.fontSize.sm,
    textAlign: 'center',
  },
  form: {
    width: '100%',
    maxWidth: 280,
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: staticColors.border,
    backgroundColor: staticColors.surface,
    color: staticColors.textPrimary,
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSize.sm,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
  emailButton: {
    backgroundColor: staticColors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    alignItems: 'center',
  },
  emailButtonText: {
    fontFamily: theme.fonts.medium,
    color: '#000000',
    fontSize: theme.fontSize.sm,
    letterSpacing: 1.5,
  },
  toggleText: {
    fontFamily: theme.fonts.regular,
    color: staticColors.textSecondary,
    fontSize: theme.fontSize.xs,
    textAlign: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 280,
    marginVertical: theme.spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: staticColors.border,
  },
  dividerText: {
    fontFamily: theme.fonts.regular,
    color: staticColors.textMuted,
    fontSize: theme.fontSize.xs,
    marginHorizontal: theme.spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
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
