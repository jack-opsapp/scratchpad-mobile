import { supabase } from './supabase';
import type { PermissionRole, PublicLink } from '@slate/shared';
import { API_URL } from '@env';

const API_BASE = API_URL || 'https://slate.opsapp.co';

export interface Collaborator {
  permissionId: string;
  userId: string;
  role: PermissionRole;
  email: string;
}

export interface PendingInvitation {
  id: string;
  page_id: string;
  email: string;
  role: PermissionRole;
  invited_by_user_id: string;
  created_at: string;
  expires_at: string;
}

// ============================================================================
// ROLE CHECKING
// ============================================================================

export async function getPageRole(
  userId: string,
  pageId: string,
): Promise<PermissionRole | null> {
  const { data, error } = await supabase
    .from('page_permissions')
    .select('role')
    .eq('page_id', pageId)
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;
  return data.role as PermissionRole;
}

export async function canManageCollaborators(
  userId: string,
  pageId: string,
): Promise<boolean> {
  const role = await getPageRole(userId, pageId);
  return ['owner', 'team-admin'].includes(role || '');
}

// ============================================================================
// COLLABORATOR MANAGEMENT
// ============================================================================

export async function getPageCollaborators(
  pageId: string,
): Promise<Collaborator[]> {
  const { data, error } = await supabase
    .from('page_permissions')
    .select(`
      id,
      role,
      user_id,
      users:user_id (
        id,
        email,
        created_at
      )
    `)
    .eq('page_id', pageId)
    .order('role');

  if (error) throw error;

  return (data || []).map((p: any) => ({
    permissionId: p.id,
    userId: p.user_id,
    role: p.role as PermissionRole,
    email: p.users?.email || '',
  }));
}

export async function getPendingInvitations(
  pageId: string,
): Promise<PendingInvitation[]> {
  const { data, error } = await supabase
    .from('pending_invitations')
    .select('*')
    .eq('page_id', pageId)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as PendingInvitation[];
}

export async function inviteUserByEmail(
  pageId: string,
  email: string,
  role: PermissionRole,
  inviterId: string,
): Promise<{ status: 'added' | 'pending'; userId?: string; email?: string }> {
  // Check if user exists
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single();

  if (existingUser) {
    const { error } = await supabase.from('page_permissions').insert({
      page_id: pageId,
      user_id: existingUser.id,
      role,
      status: 'pending',
    });
    if (error) throw error;
    return { status: 'added', userId: existingUser.id };
  } else {
    const { error } = await supabase.from('pending_invitations').insert({
      page_id: pageId,
      email,
      role,
      invited_by_user_id: inviterId,
    });
    if (error) throw error;
    return { status: 'pending', email };
  }
}

export async function removeCollaborator(
  pageId: string,
  targetUserId: string,
  currentUserId: string,
): Promise<void> {
  const myRole = await getPageRole(currentUserId, pageId);
  if (!['owner', 'team-admin'].includes(myRole || '')) {
    throw new Error('Insufficient permissions');
  }

  const targetRole = await getPageRole(targetUserId, pageId);
  if (targetRole === 'owner' && myRole === 'team-admin') {
    throw new Error('Team-Admin cannot remove Owner');
  }

  const { error } = await supabase
    .from('page_permissions')
    .delete()
    .eq('page_id', pageId)
    .eq('user_id', targetUserId);

  if (error) throw error;
}

export async function updateCollaboratorRole(
  pageId: string,
  targetUserId: string,
  newRole: PermissionRole,
  currentUserId: string,
): Promise<void> {
  const myRole = await getPageRole(currentUserId, pageId);
  if (!['owner', 'team-admin'].includes(myRole || '')) {
    throw new Error('Insufficient permissions');
  }

  const targetRole = await getPageRole(targetUserId, pageId);
  if (targetRole === 'owner' && myRole === 'team-admin') {
    throw new Error('Team-Admin cannot modify Owner permissions');
  }

  const { error } = await supabase
    .from('page_permissions')
    .update({ role: newRole })
    .eq('page_id', pageId)
    .eq('user_id', targetUserId);

  if (error) throw error;
}

export async function acceptPageShare(
  pageId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from('page_permissions')
    .update({ status: 'accepted' })
    .eq('page_id', pageId)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function declinePageShare(
  pageId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from('page_permissions')
    .delete()
    .eq('page_id', pageId)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function cancelInvitation(
  pageId: string,
  email: string,
  currentUserId: string,
): Promise<void> {
  const myRole = await getPageRole(currentUserId, pageId);
  if (!['owner', 'team-admin'].includes(myRole || '')) {
    throw new Error('Insufficient permissions');
  }

  const { error } = await supabase
    .from('pending_invitations')
    .delete()
    .eq('page_id', pageId)
    .eq('email', email);

  if (error) throw error;
}

export async function resendInvitation(
  pageId: string,
  email: string,
): Promise<void> {
  const newExpiry = new Date();
  newExpiry.setDate(newExpiry.getDate() + 7);

  const { error } = await supabase
    .from('pending_invitations')
    .update({ expires_at: newExpiry.toISOString() })
    .eq('page_id', pageId)
    .eq('email', email);

  if (error) throw error;
}

// ============================================================================
// PUBLIC LINKS
// ============================================================================

export async function getPublicLink(
  pageId: string,
): Promise<PublicLink | null> {
  const { data, error } = await supabase
    .from('public_links')
    .select('*')
    .eq('page_id', pageId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return (data as PublicLink) || null;
}

export async function createPublicLink(
  pageId: string,
  userId: string,
  password?: string,
): Promise<PublicLink> {
  let passwordHash: string | null = null;
  if (password) {
    passwordHash = btoa(password);
  }

  const { data, error } = await supabase
    .from('public_links')
    .insert({
      page_id: pageId,
      created_by_user_id: userId,
      password_hash: passwordHash,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data as PublicLink;
}

export async function togglePublicVisibility(
  pageId: string,
  isActive: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('public_links')
    .update({ is_active: isActive })
    .eq('page_id', pageId);

  if (error) throw error;
}

export async function updatePublicLinkPassword(
  pageId: string,
  password: string | null,
): Promise<void> {
  const passwordHash = password ? btoa(password) : null;

  const { error } = await supabase
    .from('public_links')
    .update({ password_hash: passwordHash })
    .eq('page_id', pageId);

  if (error) throw error;
}

export async function regeneratePublicLink(
  pageId: string,
  userId: string,
): Promise<PublicLink> {
  await supabase.from('public_links').delete().eq('page_id', pageId);
  return await createPublicLink(pageId, userId);
}

// ============================================================================
// EMAIL
// ============================================================================

export async function sendInviteEmail(
  toEmail: string,
  inviterName: string,
  pageName: string,
): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/send-invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toEmail, inviterName, pageName }),
    });
  } catch {
    // Non-critical — invitation still exists in DB
    console.warn('Failed to send invite email');
  }
}
