import type { Section } from './section';

export interface Page {
  id: string;
  user_id: string;
  name: string;
  starred: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface PageWithSections extends Page {
  sections: Section[];
}

export interface PageWithRole extends PageWithSections {
  myRole?: PermissionRole;
}

export type PermissionRole = 'owner' | 'team-admin' | 'team' | 'team-limited';

export interface PagePermission {
  id: string;
  page_id: string;
  user_id: string;
  role: PermissionRole;
  created_at: string;
}

export interface PublicLink {
  id: string;
  page_id: string;
  token: string;
  password_hash: string | null;
  is_active: boolean;
  created_by_user_id: string;
  created_at: string;
  view_count: number;
  last_viewed_at: string | null;
}

export interface CreatePageInput {
  name: string;
}

export interface UpdatePageInput {
  page_id?: string;
  page_name?: string;
  new_name?: string;
  starred?: boolean;
  position?: number;
}
