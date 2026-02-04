export interface Note {
  id: string;
  section_id: string;
  content: string;
  completed: boolean;
  completed_by_user_id: string | null;
  completed_at: string | null;
  date: string | null; // Format: "Jan 15"
  tags: string[];
  created_by_user_id: string | null;
  embedding?: number[]; // 1536-dimensional vector
  created_at: string;
  updated_at: string;
}

export interface CreateNoteInput {
  content: string;
  section_id?: string;
  section_name?: string;
  page_name?: string;
  tags?: string[];
  date?: string | null;
}

export interface UpdateNoteInput {
  note_id: string;
  content?: string;
  tags?: string[];
  add_tags?: string[];
  remove_tags?: string[];
  date?: string | null;
  completed?: boolean;
}

export interface MoveNoteInput {
  note_id: string;
  to_section_id?: string;
  to_section_name?: string;
  to_page_name?: string;
}

export interface NoteFilter {
  section_id?: string;
  section_name?: string;
  page_name?: string;
  tags?: string[];
  has_no_tags?: boolean;
  completed?: boolean;
  search?: string;
  note_ids?: string[];
  limit?: number;
}

export interface BulkUpdateInput {
  filter: NoteFilter;
  updates: {
    add_tags?: string[];
    remove_tags?: string[];
    set_tags?: string[];
    completed?: boolean;
    move_to_section_id?: string;
    move_to_section_name?: string;
  };
}

export interface BulkDeleteInput {
  filter: NoteFilter;
}
