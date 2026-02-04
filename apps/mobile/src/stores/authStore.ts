import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '@slate/shared';
import { supabase } from '../services/supabase';
import { getCurrentUser, signInWithGoogle, signOut } from '../services/auth';

interface AuthState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  login: () => Promise<boolean>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      loading: false,
      initialized: false,
      error: null,

      initialize: async () => {
        set({ loading: true });

        try {
          // Check for existing session
          const user = await getCurrentUser();
          set({ user, initialized: true, loading: false });

          // Listen for auth changes
          supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
              const user = await getCurrentUser();
              set({ user, error: null });
            } else if (event === 'SIGNED_OUT') {
              set({ user: null });
            }
          });

        } catch (error) {
          console.error('Auth initialization error:', error);
          set({
            initialized: true,
            loading: false,
            error: 'Failed to initialize authentication'
          });
        }
      },

      login: async () => {
        set({ loading: true, error: null });

        const result = await signInWithGoogle();

        if (result.success) {
          const user = await getCurrentUser();
          set({ user, loading: false });
          return true;
        } else {
          set({ loading: false, error: result.error || 'Login failed' });
          return false;
        }
      },

      logout: async () => {
        set({ loading: true });
        await signOut();
        set({ user: null, loading: false });
      },

      setUser: (user) => set({ user }),
      setError: (error) => set({ error }),
    }),
    {
      name: 'slate-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ user: state.user }),
    }
  )
);
