import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { SCHEMA_SQL } from './schema';

type Env = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors());

// Initialize schema on first request
async function ensureSchema(db: D1Database): Promise<void> {
  const v = await db.prepare("SELECT value FROM settings WHERE key = 'schema_version'").first<{ value: string }>();
  if (v?.value === '1') return;

  const stmts = SCHEMA_SQL.split(';').map(s => s.trim()).filter(Boolean);
  for (const stmt of stmts) {
    await db.prepare(stmt).run();
  }
  await db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '1')").run();
}

// Health check
app.get('/api/health', async (c) => {
  await ensureSchema(c.env.DB);
  return c.json({ ok: true });
});

export default app;
