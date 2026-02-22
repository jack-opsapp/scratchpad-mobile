import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Page, PageWithSections, Section, Note, PermissionRole } from '@slate/shared';
import { supabase } from '../services/supabase';
import { useAuthStore } from './authStore';
import { acceptPageShare as acceptPageShareService, declinePageShare as declinePageShareService } from '../services/permissions';

export interface SharedPage extends PageWithSections {
  myRole: PermissionRole;
  permissionStatus: string; // 'pending' | 'accepted'
  ownerEmail: string;
}

export interface UserProfile {
  email: string;
  full_name: string | null;
}

interface DataState {
  pages: PageWithSections[];
  sharedPages: SharedPage[];
  notes: Note[];
  tags: string[];
  userProfiles: Record<string, UserProfile>;
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
  moveNote: (noteId: string, toSectionId: string) => Promise<void>;

  // Shared page actions
  acceptSharedPage: (pageId: string) => Promise<void>;
  declineSharedPage: (pageId: string) => Promise<void>;

  // Utilities
  getNotesForSection: (sectionId: string) => Note[];
  extractTags: () => string[];
}

export const useDataStore = create<DataState>()(
  persist(
    (set, get) => ({
      pages: [],
      sharedPages: [],
      notes: [],
      tags: [],
      userProfiles: {},
      loading: false,
      error: null,
      lastFetched: null,

      fetchData: async () => {
        const { user } = useAuthStore.getState();
        console.log('[DataStore] fetchData called, user:', user?.id ?? 'NULL');
        if (!user) return;

        // Check actual Supabase session
        const { data: { session } } = await supabase.auth.getSession();
        console.log('[DataStore] Supabase session:', session ? `valid, expires: ${new Date((session.expires_at ?? 0) * 1000).toISOString()}` : 'NULL/EXPIRED');

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

          console.log('[DataStore] pages result:', pagesData?.length ?? 0, 'pages, error:', pagesError?.message ?? 'none');
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

          console.log('[DataStore] notes result:', notesData?.length ?? 0, 'notes, error:', notesError?.message ?? 'none');
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

          // --- Fetch shared pages ---
          const ownedPageIds = new Set(pages.map((p: any) => p.id));

          const { data: permData } = await supabase
            .from('page_permissions')
            .select('page_id, role, status, created_at')
            .eq('user_id', user.id);

          const sharedPerms = (permData || []).filter(
            (p: any) => !ownedPageIds.has(p.page_id) && p.status !== 'declined',
          );

          let sharedPages: SharedPage[] = [];
          let sharedNotes: Note[] = [];

          if (sharedPerms.length > 0) {
            const sharedPageIds = sharedPerms.map((p: any) => p.page_id);

            const { data: sharedPagesData } = await supabase
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
                ),
                users:user_id (
                  email
                )
              `)
              .in('id', sharedPageIds);

            const permMap = new Map(
              sharedPerms.map((p: any) => [p.page_id, p]),
            );

            sharedPages = (sharedPagesData || []).map((page: any) => {
              const perm = permMap.get(page.id);
              return {
                ...page,
                sections: (page.sections || []).sort((a: Section, b: Section) =>
                  a.position - b.position,
                ),
                myRole: perm?.role as PermissionRole,
                permissionStatus: perm?.status || 'accepted',
                ownerEmail: page.users?.email || '',
              };
            });

            // Fetch notes for shared pages
            const allSharedSectionIds = sharedPages.flatMap((p) =>
              p.sections.map((s) => s.id),
            );

            if (allSharedSectionIds.length > 0) {
              const { data: sharedNotesData } = await supabase
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
                  updated_at
                `)
                .in('section_id', allSharedSectionIds)
                .order('created_at', { ascending: false });

              sharedNotes = (sharedNotesData || []).map((note: any) => ({
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
            }
          }

          // Extract unique tags
          const allNotes = [...notes, ...sharedNotes];
          const tags = [...new Set(allNotes.flatMap((n: Note) => n.tags))].sort();

          // Fetch user profiles for note creators
          const creatorIds = [...new Set(
            allNotes
              .map((n: Note) => n.created_by_user_id)
              .filter((id): id is string => !!id),
          )];

          const userProfiles: Record<string, UserProfile> = {};

          // Add current user profile from authStore
          if (user.email) {
            userProfiles[user.id] = {
              email: user.email,
              full_name: (user as any).user_metadata?.full_name || null,
            };
          }

          // Fetch other creator profiles
          const otherCreatorIds = creatorIds.filter((id) => id !== user.id);
          if (otherCreatorIds.length > 0) {
            try {
              const { data: profilesData } = await supabase
                .from('users')
                .select('id, email, raw_user_meta_data')
                .in('id', otherCreatorIds);

              if (profilesData) {
                for (const profile of profilesData) {
                  userProfiles[profile.id] = {
                    email: profile.email || '',
                    full_name: profile.raw_user_meta_data?.full_name || null,
                  };
                }
              }
            } catch (e) {
              // Profile lookup is best-effort; continue without it
              console.log('[DataStore] Profile lookup failed, using fallback:', e);
            }
          }

          set({
            pages,
            sharedPages,
            notes: allNotes,
            tags,
            userProfiles,
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

      updatePage: (id, updates) => {
        set((state) => ({
          pages: state.pages.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        }));
        // Persist to Supabase
        supabase
          .from('pages')
          .update(updates)
          .eq('id', id)
          .then(({ error }) => {
            if (error) console.error('Update page error:', error);
          });
      },

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

      updateNote: (id, updates) => {
        set((state) => {
          const newNotes = state.notes.map((n) =>
            n.id === id ? { ...n, ...updates } : n
          );
          const newTags = [...new Set(newNotes.flatMap((n) => n.tags))].sort();
          return { notes: newNotes, tags: newTags };
        });
        // Persist to Supabase
        supabase
          .from('notes')
          .update(updates)
          .eq('id', id)
          .then(({ error }) => {
            if (error) console.error('Update note error:', error);
          });
      },

      removeNote: (id) => {
        set((state) => {
          const newNotes = state.notes.filter((n) => n.id !== id);
          const newTags = [...new Set(newNotes.flatMap((n) => n.tags))].sort();
          return { notes: newNotes, tags: newTags };
        });
        // Persist to Supabase
        supabase
          .from('notes')
          .delete()
          .eq('id', id)
          .then(({ error }) => {
            if (error) console.error('Delete note error:', error);
          });
      },

      moveNote: async (noteId, toSectionId) => {
        // Optimistic update
        const prev = get().notes;
        set((state) => ({
          notes: state.notes.map((n) =>
            n.id === noteId ? { ...n, section_id: toSectionId } : n
          ),
        }));

        const { error } = await supabase
          .from('notes')
          .update({ section_id: toSectionId })
          .eq('id', noteId);

        if (error) {
          console.error('Move note error:', error);
          // Rollback
          set({ notes: prev });
        }
      },

      // Shared page actions
      acceptSharedPage: async (pageId) => {
        const { user } = useAuthStore.getState();
        if (!user) return;

        // Optimistic update
        set((state) => ({
          sharedPages: state.sharedPages.map((p) =>
            p.id === pageId ? { ...p, permissionStatus: 'accepted' } : p,
          ),
        }));

        try {
          await acceptPageShareService(pageId, user.id);
        } catch (error) {
          console.error('Accept shared page error:', error);
          // Rollback
          set((state) => ({
            sharedPages: state.sharedPages.map((p) =>
              p.id === pageId ? { ...p, permissionStatus: 'pending' } : p,
            ),
          }));
        }
      },

      declineSharedPage: async (pageId) => {
        const { user } = useAuthStore.getState();
        if (!user) return;

        const prev = get().sharedPages;

        // Optimistic update — remove from list
        set((state) => ({
          sharedPages: state.sharedPages.filter((p) => p.id !== pageId),
        }));

        try {
          await declinePageShareService(pageId, user.id);
        } catch (error) {
          console.error('Decline shared page error:', error);
          // Rollback
          set({ sharedPages: prev });
        }
      },

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
        sharedPages: state.sharedPages,
        notes: state.notes,
        tags: state.tags,
        lastFetched: state.lastFetched,
      }),
    }
  )
);
