import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as Keychain from 'react-native-keychain';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

// Secure storage adapter using react-native-keychain
const KeychainAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      const credentials = await Keychain.getGenericPassword({ service: key });
      if (credentials) {
        return credentials.password;
      }
      return null;
    } catch (error) {
      console.error('Keychain getItem error:', error);
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await Keychain.setGenericPassword('slate-auth', value, { service: key });
    } catch (error) {
      console.error('Keychain setItem error:', error);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await Keychain.resetGenericPassword({ service: key });
    } catch (error) {
      console.error('Keychain removeItem error:', error);
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: KeychainAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
