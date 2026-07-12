export interface Env {
  DB_URL: string;
}

export interface NoteRow {
  slug: string;
  category: string;
  title: string;
  content: string;
  parent_slug: string | null;
  sort_order: number;
  updated_at: number;
}

export interface SettingRow {
  key: string;
  value: string;
}

export interface RecentRow {
  path: string;
  title: string;
  category: string;
  time: number;
}
