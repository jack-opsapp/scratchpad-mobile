import { authorize, AuthConfiguration } from 'react-native-app-auth';
import { supabase } from './supabase';
import type { User } from '@slate/shared';
import { GOOGLE_CLIENT_ID_IOS } from '@env';

// Google OAuth configuration - redirect URL must be reversed client ID for iOS
const googleConfig: AuthConfiguration = {
  issuer: 'https://accounts.google.com',
  clientId: GOOGLE_CLIENT_ID_IOS || '', // Use iOS client ID
  redirectUrl: 'com.googleusercontent.apps.1001959826984-omej1s1478oi2ub1j6hdqs130auibq5m:/oauthredirect',
  scopes: ['openid', 'profile', 'email'],
  useNonce: false, // Disable nonce for Supabase compatibility
  usePKCE: false,  // Disable PKCE for Supabase compatibility
};

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

/**
 * Sign in with Google OAuth using react-native-app-auth
 */
export async function signInWithGoogle(): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if Google OAuth is configured
    if (!GOOGLE_CLIENT_ID_IOS) {
      return {
        success: false,
        error: 'Google Sign-In is not configured. Please add GOOGLE_CLIENT_ID_IOS to your .env file.'
      };
    }

    // Get OAuth tokens from Google
    const authResult = await authorize(googleConfig);

    if (!authResult.idToken) {
      return { success: false, error: 'No ID token returned from Google' };
    }

    // Sign in to Supabase with the Google ID token
    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: authResult.idToken,
      access_token: authResult.accessToken,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };

  } catch (error) {
    console.error('Sign in error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

/**
 * Get the current session
 */
export async function getSession() {
  return supabase.auth.getSession();
}

/**
 * Get the current user
 */
export async function getCurrentUser(): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  return {
    id: user.id,
    email: user.email || '',
    created_at: user.created_at || new Date().toISOString(),
    last_sign_in: user.last_sign_in_at || null,
  };
}
