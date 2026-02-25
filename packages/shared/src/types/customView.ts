export interface CustomViewGroup {
  name: string;
  filter: {
    tags?: string[];
    completed?: boolean;
    search?: string;
  };
}

export interface CustomView {
  id: string;
  user_id: string;
  title: string;
  view_type: 'list' | 'boxes';
  page_id: string | null;
  section_id: string | null;
  groups: CustomViewGroup[];
  position: number;
  created_at: string;
}
