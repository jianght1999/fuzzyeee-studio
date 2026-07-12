import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { SCHEMA_SQL } from './schema';
import { generateToken, validateToken, invalidateToken, hashPassword, verifyPassword } from './auth';

type Env = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors());

// ---- Schema 初始化 ----
async function ensureSchema(db: D1Database): Promise<void> {
  const v = await db.prepare("SELECT value FROM settings WHERE key = 'schema_version'").first<{ value: string }>();
  if (v?.value === '1') return;

  const stmts = SCHEMA_SQL.split(';').map(s => s.trim()).filter(Boolean);
  for (const stmt of stmts) {
    await db.prepare(stmt).run();
  }
  await db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '1')").run();
}

// ---- Auth 中间件 ----
async function authMiddleware(c: any, next: any) {
  const body = await c.req.json().catch(() => ({}));
  if (!validateToken(body.token || '')) {
    return c.json({ success: false, error: 'not authenticated' }, 403);
  }
  c.set('body', body);
  await next();
}

// ---- POST /api/login ----
app.post('/api/login', async (c) => {
  await ensureSchema(c.env.DB);
  const { password } = await c.req.json<{ password: string }>();

  // 首次登录：生成并存储密码哈希
  const stored = await c.env.DB.prepare("SELECT value FROM settings WHERE key = 'password_hash'").first<{ value: string }>();
  if (!stored) {
    const hash = hashPassword(password);
    await c.env.DB.prepare("INSERT INTO settings (key, value) VALUES ('password_hash', ?)").bind(hash).run();
    const token = generateToken();
    return c.json({ success: true, token });
  }

  if (verifyPassword(password, stored.value)) {
    const token = generateToken();
    return c.json({ success: true, token });
  }
  return c.json({ success: false, error: 'wrong password' }, 401);
});

// ---- POST /api/logout ----
app.post('/api/logout', async (c) => {
  const { token } = await c.req.json<{ token: string }>();
  invalidateToken(token);
  return c.json({ success: true });
});

// ---- Health check ----
app.get('/api/health', async (c) => {
  await ensureSchema(c.env.DB);
  return c.json({ ok: true });
});

export default app;
