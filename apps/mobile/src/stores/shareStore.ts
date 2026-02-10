import { create } from 'zustand';
import type { PermissionRole, PublicLink } from '@slate/shared';
import { useAuthStore } from './authStore';
import {
  getPageRole,
  getPageCollaborators,
  getPendingInvitations,
  getPublicLink,
  inviteUserByEmail,
  removeCollaborator as removeCollaboratorService,
  updateCollaboratorRole,
  cancelInvitation as cancelInvitationService,
  resendInvitation as resendInvitationService,
  createPublicLink as createPublicLinkService,
  togglePublicVisibility,
  updatePublicLinkPassword as updatePublicLinkPasswordService,
  regeneratePublicLink as regeneratePublicLinkService,
  sendInviteEmail,
} from '../services/permissions';
import type { Collaborator, PendingInvitation } from '../services/permissions';

interface ShareState {
  pageId: string | null;
  myRole: PermissionRole | null;
  collaborators: Collaborator[];
  pendingInvitations: PendingInvitation[];
  publicLink: PublicLink | null;
  loading: boolean;
  sending: boolean;
  error: string | null;

  loadShareData: (pageId: string, userId: string) => Promise<void>;
  inviteByEmail: (
    email: string,
    role: PermissionRole,
    inviterName: string,
    pageName: string,
  ) => Promise<void>;
  removeCollaborator: (targetUserId: string) => Promise<void>;
  updateRole: (targetUserId: string, newRole: PermissionRole) => Promise<void>;
  cancelInvitation: (email: string) => Promise<void>;
  resendInvitation: (email: string) => Promise<void>;
  createPublicLink: (password?: string) => Promise<void>;
  togglePublicLink: () => Promise<void>;
  updatePublicLinkPassword: (password: string | null) => Promise<void>;
  regeneratePublicLink: () => Promise<void>;
  reset: () => void;
}

export const useShareStore = create<ShareState>()((set, get) => ({
  pageId: null,
  myRole: null,
  collaborators: [],
  pendingInvitations: [],
  publicLink: null,
  loading: false,
  sending: false,
  error: null,

  loadShareData: async (pageId: string, userId: string) => {
    set({ loading: true, error: null, pageId });
    try {
      const [role, collabs, pending, link] = await Promise.all([
        getPageRole(userId, pageId),
        getPageCollaborators(pageId),
        getPendingInvitations(pageId),
        getPublicLink(pageId),
      ]);
      set({
        myRole: role,
        collaborators: collabs,
        pendingInvitations: pending,
        publicLink: link,
        loading: false,
      });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load share data',
      });
    }
  },

  inviteByEmail: async (email, role, inviterName, pageName) => {
    const { pageId } = get();
    const userId = useAuthStore.getState().user?.id;
    if (!pageId || !userId) return;

    set({ sending: true, error: null });
    try {
      await inviteUserByEmail(pageId, email, role, userId);
      await sendInviteEmail(email, inviterName, pageName);
      // Reload data
      await get().loadShareData(pageId, userId);
    } catch (error) {
      set({
        sending: false,
        error: error instanceof Error ? error.message : 'Failed to send invite',
      });
    }
  },

  removeCollaborator: async (targetUserId) => {
    const { pageId } = get();
    const userId = useAuthStore.getState().user?.id;
    if (!pageId || !userId) return;

    try {
      await removeCollaboratorService(pageId, targetUserId, userId);
      await get().loadShareData(pageId, userId);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to remove collaborator',
      });
    }
  },

  updateRole: async (targetUserId, newRole) => {
    const { pageId } = get();
    const userId = useAuthStore.getState().user?.id;
    if (!pageId || !userId) return;

    try {
      await updateCollaboratorRole(pageId, targetUserId, newRole, userId);
      await get().loadShareData(pageId, userId);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update role',
      });
    }
  },

  cancelInvitation: async (email) => {
    const { pageId } = get();
    const userId = useAuthStore.getState().user?.id;
    if (!pageId || !userId) return;

    try {
      await cancelInvitationService(pageId, email, userId);
      await get().loadShareData(pageId, userId);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to cancel invitation',
      });
    }
  },

  resendInvitation: async (email) => {
    const { pageId } = get();
    const userId = useAuthStore.getState().user?.id;
    if (!pageId || !userId) return;

    try {
      await resendInvitationService(pageId, email);
      await get().loadShareData(pageId, userId);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to resend invitation',
      });
    }
  },

  createPublicLink: async (password?) => {
    const { pageId } = get();
    const userId = useAuthStore.getState().user?.id;
    if (!pageId || !userId) return;

    try {
      await createPublicLinkService(pageId, userId, password);
      await get().loadShareData(pageId, userId);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create public link',
      });
    }
  },

  togglePublicLink: async () => {
    const { pageId, publicLink } = get();
    const userId = useAuthStore.getState().user?.id;
    if (!pageId || !userId || !publicLink) return;

    try {
      await togglePublicVisibility(pageId, !publicLink.is_active);
      await get().loadShareData(pageId, userId);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to toggle public link',
      });
    }
  },

  updatePublicLinkPassword: async (password) => {
    const { pageId } = get();
    const userId = useAuthStore.getState().user?.id;
    if (!pageId || !userId) return;

    try {
      await updatePublicLinkPasswordService(pageId, password);
      await get().loadShareData(pageId, userId);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update password',
      });
    }
  },

  regeneratePublicLink: async () => {
    const { pageId } = get();
    const userId = useAuthStore.getState().user?.id;
    if (!pageId || !userId) return;

    try {
      await regeneratePublicLinkService(pageId, userId);
      await get().loadShareData(pageId, userId);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to regenerate link',
      });
    }
  },

  reset: () => {
    set({
      pageId: null,
      myRole: null,
      collaborators: [],
      pendingInvitations: [],
      publicLink: null,
      loading: false,
      sending: false,
      error: null,
    });
  },
}));
