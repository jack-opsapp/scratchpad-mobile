import { authorize, AuthConfiguration } from 'react-native-app-auth';
import { supabase } from './supabase';
import type { User } from '@slate/shared';

// Google OAuth configuration
const googleConfig: AuthConfiguration = {
  issuer: 'https://accounts.google.com',
  clientId: process.env.GOOGLE_CLIENT_ID_IOS!, // Use iOS client ID
  redirectUrl: 'com.slate.app:/oauth2redirect',
  scopes: ['openid', 'profile', 'email'],
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
