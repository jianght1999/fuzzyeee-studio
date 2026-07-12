import type { Env, NoteRow, SettingRow, RecentRow } from './types';

export class DB {
  private endpoint: string;
  private apiKey: string;

  constructor(env: Env) {
    this.endpoint = env.TIDB_ENDPOINT;
    this.apiKey = env.TIDB_API_KEY;
  }

  private async execute<T>(sql: string, params?: unknown[]): Promise<T[]> {
    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'sql',
        sql,
        params: params ?? [],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`TiDB error: ${res.status} ${err}`);
    }

    const data = await res.json() as { rows?: T[] };
    return data.rows ?? [];
  }

  async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    return this.execute<T>(sql, params);
  }

  // ===== notes 表操作 =====

  async getPagesByCategory(category: string): Promise<NoteRow[]> {
    return this.query<NoteRow>(
      'SELECT slug, title, parent_slug, sort_order FROM notes WHERE category = ? ORDER BY sort_order ASC',
      [category]
    );
  }

  async getPageBySlug(category: string, slug: string): Promise<NoteRow | null> {
    const rows = await this.query<NoteRow>(
      'SELECT slug, title, content, parent_slug, updated_at FROM notes WHERE category = ? AND slug = ?',
      [category, slug]
    );
    return rows[0] ?? null;
  }

  async upsertNote(note: {
    slug: string;
    category: string;
    title: string;
    content: string;
    parent_slug: string | null;
    sort_order: number;
    updated_at: number;
  }): Promise<void> {
    await this.query(
      `INSERT INTO notes (slug, category, title, content, parent_slug, sort_order, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         title = VALUES(title),
         content = VALUES(content),
         parent_slug = VALUES(parent_slug),
         sort_order = VALUES(sort_order),
         updated_at = VALUES(updated_at)`,
      [note.slug, note.category, note.title, note.content, note.parent_slug, note.sort_order, note.updated_at]
    );
  }

  async deleteNoteAndChildren(category: string, slug: string): Promise<void> {
    await this.query(
      'DELETE FROM notes WHERE category = ? AND slug LIKE ?',
      [category, slug + '/%']
    );
    await this.query(
      'DELETE FROM notes WHERE category = ? AND slug = ?',
      [category, slug]
    );
  }

  async updateNoteSlug(oldCategory: string, oldSlug: string, newCategory: string, newSlug: string): Promise<void> {
    await this.query(
      'UPDATE notes SET slug = ?, category = ? WHERE category = ? AND slug = ?',
      [newSlug, newCategory, oldCategory, oldSlug]
    );
  }

  async updateNoteSlugAndParent(
    oldCategory: string, oldSlug: string,
    newCategory: string, newSlug: string, newParentSlug: string | null
  ): Promise<void> {
    await this.query(
      'UPDATE notes SET slug = ?, category = ?, parent_slug = ? WHERE category = ? AND slug = ?',
      [newSlug, newCategory, newParentSlug, oldCategory, oldSlug]
    );
  }

  async getChildren(oldCategory: string, oldSlug: string): Promise<NoteRow[]> {
    return this.query<NoteRow>(
      'SELECT slug FROM notes WHERE category = ? AND parent_slug = ?',
      [oldCategory, oldSlug]
    );
  }

  // ===== settings 表操作 =====

  async getSetting(key: string): Promise<string | null> {
    const rows = await this.query<SettingRow>(
      'SELECT value FROM settings WHERE `key` = ?',
      [key]
    );
    return rows[0]?.value ?? null;
  }

  async setSetting(key: string, value: string): Promise<void> {
    await this.query(
      'INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)',
      [key, value]
    );
  }

  // ===== recent_files 表操作 =====

  async getRecentFiles(): Promise<RecentRow[]> {
    return this.query<RecentRow>(
      'SELECT path, title, category, time FROM recent_files ORDER BY time DESC LIMIT 50'
    );
  }

  async upsertRecent(path: string, title: string, category: string, time: number): Promise<void> {
    await this.query(
      'INSERT INTO recent_files (path, title, category, time) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE title = VALUES(title), category = VALUES(category), time = VALUES(time)',
      [path, title, category, time]
    );
  }

  async deleteRecent(path: string): Promise<void> {
    await this.query('DELETE FROM recent_files WHERE path = ?', [path]);
  }
}
