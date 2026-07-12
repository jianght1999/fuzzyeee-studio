import { Hono } from 'hono';
import { DB } from '../db';
import { validateToken } from '../auth';
import type { Env } from '../types';

const recent = new Hono<{ Bindings: Env }>();

// GET /api/recent
recent.get('/recent', async (c) => {
  const db = new DB(c.env);
  const rows = await db.getRecentFiles();
  return c.json(rows.map(r => ({
    path: r.path,
    title: r.title,
    category: r.category,
    time: r.time,
  })));
});

// POST /api/recent-delete
recent.post('/recent-delete', async (c) => {
  const db = new DB(c.env);
  const { token, path } = await c.req.json<{ token: string; path: string }>();
  if (!validateToken(token)) {
    return c.json({ error: 'not authenticated' }, 403);
  }
  await db.deleteRecent(path);
  return c.json({ success: true });
});

export { recent };
