import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';
import { useAuthStore } from './authStore';

export interface UserSettings {
  // Appearance
  theme: 'dark' | 'light';
  accent_color: string;
  default_view_mode: 'list' | 'calendar' | 'boxes';
  font_size: 'small' | 'medium' | 'large';

  // AI Behavior
  ai_response_style: 'tactical' | 'balanced' | 'conversational';
  auto_tagging_sensitivity: 1 | 2 | 3;
  confirmation_level: 1 | 2 | 3;
  voice_language: string;

  // Content
  default_page_id: string | null;
  default_section_id: string | null;
  note_sort_order: 'created_desc' | 'created_asc' | 'alpha' | 'modified';
  auto_archive_completed: number | null;

  // Data & Privacy
  chat_history_retention: number | null;
  rag_context_enabled: boolean;

  // Developer
  custom_openai_key: string | null;
  custom_openai_model: string | null;
}

const DEFAULT_SETTINGS: UserSettings = {
  theme: 'dark',
  accent_color: 'beige',
  default_view_mode: 'list',
  font_size: 'medium',
  ai_response_style: 'tactical',
  auto_tagging_sensitivity: 2,
  confirmation_level: 2,
  voice_language: 'en-US',
  default_page_id: null,
  default_section_id: null,
  note_sort_order: 'created_desc',
  auto_archive_completed: null,
  chat_history_retention: null,
  rag_context_enabled: true,
  custom_openai_key: null,
  custom_openai_model: null,
};

interface SettingsState {
  settings: UserSettings;
  loading: boolean;
  error: string | null;

  fetchSettings: () => Promise<void>;
  updateSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => Promise<void>;
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: { ...DEFAULT_SETTINGS },
      loading: false,
      error: null,

      fetchSettings: async () => {
        const { user } = useAuthStore.getState();
        if (!user) return;

        set({ loading: true, error: null });

        try {
          const { data, error } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', user.id)
            .single();

          if (error) {
            if (error.code === 'PGRST116') {
              // No settings row yet - create one
              const { error: insertError } = await supabase
                .from('user_settings')
                .insert({ user_id: user.id });
              if (insertError) throw insertError;
              set({ settings: { ...DEFAULT_SETTINGS }, loading: false });
              return;
            }
            throw error;
          }

          if (data) {
            const settings: UserSettings = {
              theme: data.theme || DEFAULT_SETTINGS.theme,
              accent_color: data.accent_color || DEFAULT_SETTINGS.accent_color,
              default_view_mode: data.default_view_mode || DEFAULT_SETTINGS.default_view_mode,
              font_size: data.font_size || DEFAULT_SETTINGS.font_size,
              ai_response_style: data.ai_response_style || DEFAULT_SETTINGS.ai_response_style,
              auto_tagging_sensitivity: data.auto_tagging_sensitivity ?? DEFAULT_SETTINGS.auto_tagging_sensitivity,
              confirmation_level: data.confirmation_level ?? DEFAULT_SETTINGS.confirmation_level,
              voice_language: data.voice_language || DEFAULT_SETTINGS.voice_language,
              default_page_id: data.default_page_id,
              default_section_id: data.default_section_id,
              note_sort_order: data.note_sort_order || DEFAULT_SETTINGS.note_sort_order,
              auto_archive_completed: data.auto_archive_completed,
              chat_history_retention: data.chat_history_retention,
              rag_context_enabled: data.rag_context_enabled ?? DEFAULT_SETTINGS.rag_context_enabled,
              custom_openai_key: data.custom_openai_key,
              custom_openai_model: data.custom_openai_model,
            };
            set({ settings, loading: false });
          }
        } catch (error) {
          console.error('Fetch settings error:', error);
          set({
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to fetch settings',
          });
        }
      },

      updateSetting: async (key, value) => {
        const { user } = useAuthStore.getState();
        if (!user) return;

        // Optimistic update
        const prev = get().settings;
        set({ settings: { ...prev, [key]: value } });

        const { error } = await supabase
          .from('user_settings')
          .update({ [key]: value })
          .eq('user_id', user.id);

        if (error) {
          console.error('Update setting error:', error);
          set({ settings: prev });
        }
      },

      updateSettings: async (updates) => {
        const { user } = useAuthStore.getState();
        if (!user) return;

        const prev = get().settings;
        set({ settings: { ...prev, ...updates } });

        const { error } = await supabase
          .from('user_settings')
          .update(updates)
          .eq('user_id', user.id);

        if (error) {
          console.error('Update settings error:', error);
          set({ settings: prev });
        }
      },
    }),
    {
      name: 'slate-settings',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        settings: state.settings,
      }),
    }
  )
);
