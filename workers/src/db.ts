import type { Env, NoteRow, SettingRow, RecentRow } from './types';

// TiDB Serverless HTTP API 端点格式：https://http-{host}/v1beta/sql
// 这是 @tidbcloud/serverless 包底层的实际 API，我们直接调

// SQL 参数格式化（来自 @tidbcloud/serverless 的实现）
function sanitize(value: unknown): string {
  if (value == null) return 'null';
  if (typeof value === 'number' || typeof value === 'bigint') return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (value instanceof Uint8Array) {
    return 'x\'' + Array.from(value).map(b => b.toString(16).padStart(2, '0')).join('') + '\'';
  }
  return quote(String(value));
}

function quote(str: string): string {
  return '\'' + str.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + '\'';
}

function format(sql: string, values?: unknown[]): string {
  if (!values || values.length === 0) return sql;
  let idx = 0;
  return sql.replace(/\?/g, () => idx < values.length ? sanitize(values[idx++]) : '?');
}

export class DB {
  private host: string;
  private username: string;
  private password: string;
  private database: string;

  constructor(env: Env) {
    const u = new URL(env.DB_URL);
    this.host = u.hostname;
    this.username = decodeURIComponent(u.username);
    this.password = decodeURIComponent(u.password);
    this.database = decodeURIComponent(u.pathname.replace(/^\//, ''));
  }

  private async execute<T>(sql: string, params?: unknown[]): Promise<T[]> {
    const query = format(sql, params);
    const url = `https://http-${this.host}/v1beta/sql`;
    const auth = btoa(`${this.username}:${this.password}`);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
        'TiDB-Database': this.database,
      },
      body: JSON.stringify({ query }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`TiDB ${res.status}: ${err}`);
    }

    const data = await res.json() as { rows?: unknown[][]; types?: { name: string }[] };
    const rows = data.rows ?? [];
    const types = data.types ?? [];

    // TiDB 返回的 rows 是数组的数组 [[val1,val2],[val1,val2],...]
    // 需要按 types 中的列名映射为对象
    if (types.length > 0 && rows.length > 0 && Array.isArray(rows[0])) {
      const keys = types.map(t => t.name);
      return rows.map(row => {
        const obj: Record<string, unknown> = {};
        keys.forEach((k, i) => { obj[k] = (row as unknown[])[i]; });
        return obj as T;
      });
    }

    return rows as unknown as T[];
  }

  async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    return this.execute<T>(sql, params);
  }

  async getPagesByCategory(category: string): Promise<NoteRow[]> {
    return this.query<NoteRow>(
      'SELECT slug, title, parent_slug, sort_order FROM notes WHERE category = ? ORDER BY sort_order ASC', [category]);
  }

  async getPageBySlug(category: string, slug: string): Promise<NoteRow | null> {
    const rows = await this.query<NoteRow>(
      'SELECT slug, title, content, parent_slug, sort_order, updated_at FROM notes WHERE category = ? AND slug = ?', [category, slug]);
    return rows[0] ?? null;
  }

  async upsertNote(n: { slug: string; category: string; title: string; content: string; parent_slug: string | null; sort_order: number; updated_at: number }): Promise<void> {
    await this.query(
      `INSERT INTO notes (slug, category, title, content, parent_slug, sort_order, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE title=VALUES(title), content=VALUES(content), parent_slug=VALUES(parent_slug), sort_order=VALUES(sort_order), updated_at=VALUES(updated_at)`,
      [n.slug, n.category, n.title, n.content, n.parent_slug, n.sort_order, n.updated_at]);
  }

  async deleteNoteAndChildren(cat: string, slug: string): Promise<void> {
    await this.query('DELETE FROM notes WHERE category = ? AND slug LIKE ?', [cat, slug + '/%']);
    await this.query('DELETE FROM notes WHERE category = ? AND slug = ?', [cat, slug]);
  }

  async updateNoteSlug(oc: string, os: string, nc: string, ns: string): Promise<void> {
    await this.query('UPDATE notes SET slug=?, category=? WHERE category=? AND slug=?', [ns, nc, oc, os]);
  }

  async updateNoteSlugAndParent(oc: string, os: string, nc: string, ns: string, np: string | null): Promise<void> {
    await this.query('UPDATE notes SET slug=?, category=?, parent_slug=? WHERE category=? AND slug=?', [ns, nc, np, oc, os]);
  }

  async getChildren(cat: string, slug: string): Promise<NoteRow[]> {
    return this.query<NoteRow>('SELECT slug FROM notes WHERE category = ? AND parent_slug = ?', [cat, slug]);
  }

  async getSetting(key: string): Promise<string | null> {
    const rows = await this.query<SettingRow>('SELECT value FROM settings WHERE `key` = ?', [key]);
    return rows[0]?.value ?? null;
  }

  async setSetting(key: string, value: string): Promise<void> {
    await this.query('INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)', [key, value]);
  }

  async getRecentFiles(): Promise<RecentRow[]> {
    return this.query<RecentRow>('SELECT path, title, category, time FROM recent_files ORDER BY time DESC LIMIT 50');
  }

  async upsertRecent(path: string, title: string, category: string, time: number): Promise<void> {
    await this.query('INSERT INTO recent_files (path, title, category, time) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE title=VALUES(title), category=VALUES(category), time=VALUES(time)', [path, title, category, time]);
  }

  async deleteRecent(path: string): Promise<void> {
    await this.query('DELETE FROM recent_files WHERE path = ?', [path]);
  }
}
