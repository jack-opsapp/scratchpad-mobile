import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Page, PageWithSections, Section, Note } from '@slate/shared';
import { supabase } from '../services/supabase';
import { useAuthStore } from './authStore';

interface DataState {
  pages: PageWithSections[];
  notes: Note[];
  tags: string[];
  loading: boolean;
  error: string | null;
  lastFetched: number | null;

  // Actions
  fetchData: () => Promise<void>;
  refreshData: () => Promise<void>;

  // Page actions
  addPage: (page: PageWithSections) => void;
  updatePage: (id: string, updates: Partial<Page>) => void;
  removePage: (id: string) => void;

  // Section actions
  addSection: (pageId: string, section: Section) => void;
  updateSection: (id: string, updates: Partial<Section>) => void;
  removeSection: (id: string) => void;

  // Note actions
  addNote: (note: Note) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  removeNote: (id: string) => void;

  // Utilities
  getNotesForSection: (sectionId: string) => Note[];
  extractTags: () => string[];
}

export const useDataStore = create<DataState>()(
  persist(
    (set, get) => ({
      pages: [],
      notes: [],
      tags: [],
      loading: false,
      error: null,
      lastFetched: null,

      fetchData: async () => {
        const { user } = useAuthStore.getState();
        if (!user) return;

        set({ loading: true, error: null });

        try {
          // Fetch pages with sections
          const { data: pagesData, error: pagesError } = await supabase
            .from('pages')
            .select(`
              id,
              name,
              user_id,
              starred,
              position,
              created_at,
              updated_at,
              sections (
                id,
                name,
                page_id,
                position,
                created_at,
                updated_at
              )
            `)
            .eq('user_id', user.id)
            .order('position', { ascending: true });

          if (pagesError) throw pagesError;

          // Fetch all notes
          const { data: notesData, error: notesError } = await supabase
            .from('notes')
            .select(`
              id,
              section_id,
              content,
              completed,
              completed_by_user_id,
              completed_at,
              date,
              tags,
              created_by_user_id,
              created_at,
              updated_at,
              sections!inner (
                page_id,
                pages!inner (
                  user_id
                )
              )
            `)
            .eq('sections.pages.user_id', user.id)
            .order('created_at', { ascending: false });

          if (notesError) throw notesError;

          // Transform data
          const pages = (pagesData || []).map((page: any) => ({
            ...page,
            sections: (page.sections || []).sort((a: Section, b: Section) =>
              a.position - b.position
            ),
          }));

          const notes = (notesData || []).map((note: any) => ({
            id: note.id,
            section_id: note.section_id,
            content: note.content,
            completed: note.completed,
            completed_by_user_id: note.completed_by_user_id,
            completed_at: note.completed_at,
            date: note.date,
            tags: note.tags || [],
            created_by_user_id: note.created_by_user_id,
            created_at: note.created_at,
            updated_at: note.updated_at,
          }));

          // Extract unique tags
          const tags = [...new Set(notes.flatMap((n: Note) => n.tags))].sort();

          set({
            pages,
            notes,
            tags,
            loading: false,
            lastFetched: Date.now(),
          });

        } catch (error) {
          console.error('Fetch data error:', error);
          set({
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to fetch data',
          });
        }
      },

      refreshData: async () => {
        await get().fetchData();
      },

      // Page actions
      addPage: (page) => set((state) => ({
        pages: [...state.pages, page],
      })),

      updatePage: (id, updates) => set((state) => ({
        pages: state.pages.map((p) =>
          p.id === id ? { ...p, ...updates } : p
        ),
      })),

      removePage: (id) => set((state) => ({
        pages: state.pages.filter((p) => p.id !== id),
        notes: state.notes.filter((n) => {
          const section = state.pages
            .find((p) => p.id === id)
            ?.sections.find((s) => s.id === n.section_id);
          return !section;
        }),
      })),

      // Section actions
      addSection: (pageId, section) => set((state) => ({
        pages: state.pages.map((p) =>
          p.id === pageId
            ? { ...p, sections: [...p.sections, section] }
            : p
        ),
      })),

      updateSection: (id, updates) => set((state) => ({
        pages: state.pages.map((p) => ({
          ...p,
          sections: p.sections.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        })),
      })),

      removeSection: (id) => set((state) => ({
        pages: state.pages.map((p) => ({
          ...p,
          sections: p.sections.filter((s) => s.id !== id),
        })),
        notes: state.notes.filter((n) => n.section_id !== id),
      })),

      // Note actions
      addNote: (note) => set((state) => {
        const newNotes = [note, ...state.notes];
        const newTags = [...new Set(newNotes.flatMap((n) => n.tags))].sort();
        return { notes: newNotes, tags: newTags };
      }),

      updateNote: (id, updates) => set((state) => {
        const newNotes = state.notes.map((n) =>
          n.id === id ? { ...n, ...updates } : n
        );
        const newTags = [...new Set(newNotes.flatMap((n) => n.tags))].sort();
        return { notes: newNotes, tags: newTags };
      }),

      removeNote: (id) => set((state) => {
        const newNotes = state.notes.filter((n) => n.id !== id);
        const newTags = [...new Set(newNotes.flatMap((n) => n.tags))].sort();
        return { notes: newNotes, tags: newTags };
      }),

      // Utilities
      getNotesForSection: (sectionId) => {
        return get().notes.filter((n) => n.section_id === sectionId);
      },

      extractTags: () => {
        return [...new Set(get().notes.flatMap((n) => n.tags))].sort();
      },
    }),
    {
      name: 'slate-data',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        pages: state.pages,
        notes: state.notes,
        tags: state.tags,
        lastFetched: state.lastFetched,
      }),
    }
  )
);
