export interface Section {
  id: string;
  page_id: string;
  name: string;
  position: number;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSectionInput {
  name: string;
  page_id?: string;
  page_name?: string;
}

export interface UpdateSectionInput {
  section_id?: string;
  section_name?: string;
  page_name?: string;
  new_name?: string;
}

export interface MoveSectionInput {
  section_id?: string;
  section_name?: string;
  to_page_id?: string;
  to_page_name?: string;
}
