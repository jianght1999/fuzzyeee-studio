import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { SCHEMA_SQL } from './schema';
import { generateToken, validateToken, invalidateToken, hashPassword, verifyPassword } from './auth';

type Env = {
  DB: D1Database;
  NOTES_CONTENT: KVNamespace;
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

// ---- 辅助函数 ----

// 从 HTML 提取 h1 标题
function extractTitle(content: string): string {
  const m = content.match(/<h1[^>]*>(.+?)<\/h1>/i);
  return m ? m[1].replace(/<[^>]+>/g, '').trim() : 'Untitled';
}

// 从 slug 获取父 slug（如 "Comping/drop 2" → "Comping"，"Blues" → null）
function getParentSlug(slug: string): string | null {
  const parts = slug.split('/');
  return parts.length > 1 ? parts.slice(0, -1).join('/') : null;
}

// 从文件路径解析 category 和 slug
// 输入："src/content/guitar/Comping/drop 2.html" → { category: "guitar", slug: "Comping/drop 2" }
// 输入："src/content/guitar/Blues.html" → { category: "guitar", slug: "Blues" }
function parsePath(p: string): { category: string; slug: string } {
  const cleaned = p.replace(/\\/g, '/').replace(/^src\/content\//, '').replace(/\.html$/, '');
  const idx = cleaned.indexOf('/');
  if (idx === -1) return { category: cleaned, slug: cleaned };
  return { category: cleaned.substring(0, idx), slug: cleaned.substring(idx + 1) };
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

// ---- GET /api/pages/:category — 获取分类下页面列表 ----
app.get('/api/pages/:category', async (c) => {
  await ensureSchema(c.env.DB);
  const category = c.req.param('category');
  const { results } = await c.env.DB.prepare(
    'SELECT slug, title, parent_slug as parentSlug, sort_order as sortOrder FROM notes WHERE category = ? ORDER BY sort_order ASC'
  ).bind(category).all<{ slug: string; title: string; parentSlug: string | null; sortOrder: number }>();

  const slugsWithChildren = new Set<string>();
  for (const r of results) {
    if (r.parentSlug) slugsWithChildren.add(r.parentSlug);
  }
  const pages = results.map(r => ({
    slug: r.slug,
    title: r.title,
    parentSlug: r.parentSlug,
    sortOrder: r.sortOrder,
    hasChildren: slugsWithChildren.has(r.slug),
  }));
  return c.json({ pages });
});

// ---- GET /api/pages/:category/:slug — 获取单篇内容 ----
app.get('/api/pages/:category/:slug{.*}', async (c) => {
  await ensureSchema(c.env.DB);
  const category = c.req.param('category');
  let slug = c.req.param('slug');
  if (slug.startsWith('/')) slug = slug.slice(1);

  const row = await c.env.DB.prepare(
    'SELECT slug, title, content, parent_slug as parentSlug, updated_at as updatedAt FROM notes WHERE category = ? AND slug = ?'
  ).bind(category, slug).first<{ slug: string; title: string; content: string; parentSlug: string | null; updatedAt: number }>();

  if (!row) return c.json({ error: 'not found' }, 404);

  // KV 优先（大文件），D1 content 字段作为 fallback
  const kvContent = await c.env.NOTES_CONTENT.get(`content/${category}/${slug}`);
  return c.json({ ...row, content: kvContent || row.content });
});

// ---- POST /api/save — 保存笔记 ----
app.post('/api/save', authMiddleware, async (c) => {
  const body = (c as any).get('body') as { path: string; content: string };
  const { category, slug } = parsePath(body.path);

  const title = extractTitle(body.content);
  const now = Date.now();
  const KV_THRESHOLD = 90 * 1024; // 超过 90KB 存 KV

  await c.env.DB.prepare(
    `INSERT OR REPLACE INTO notes (slug, category, title, content, parent_slug, sort_order, updated_at)
     VALUES (?, ?, ?, ?, ?, COALESCE((SELECT sort_order FROM notes WHERE slug = ? AND category = ?), 0), ?)`
  ).bind(slug, category, title, body.content.length > KV_THRESHOLD ? '' : body.content, getParentSlug(slug), slug, category, now).run();

  // 大文件存 KV
  if (body.content.length > KV_THRESHOLD) {
    await c.env.NOTES_CONTENT.put(`content/${category}/${slug}`, body.content);
  } else {
    await c.env.NOTES_CONTENT.delete(`content/${category}/${slug}`).catch(() => {});
  }

  // 更新最近文件
  await c.env.DB.prepare(
    `INSERT OR REPLACE INTO recent_files (path, title, category, time) VALUES (?, ?, ?, ?)`
  ).bind(body.path, title, category, now).run();

  return c.json({ success: true });
});

// ---- POST /api/create-page — 创建新页面 ----
app.post('/api/create-page', authMiddleware, async (c) => {
  const body = (c as any).get('body') as { path: string; content?: string };
  const { category, slug } = parsePath(body.path);

  const htmlContent = body.content || `<h1>${slug.split('/').pop()}</h1>\n<p></p>`;
  const title = extractTitle(htmlContent);
  const now = Date.now();

  await c.env.DB.prepare(
    `INSERT INTO notes (slug, category, title, content, parent_slug, sort_order, updated_at)
     VALUES (?, ?, ?, ?, ?, 0, ?)`
  ).bind(slug, category, title, htmlContent, getParentSlug(slug), now).run();

  return c.json({ success: true });
});

// ---- POST /api/delete-page — 删除页面（含子页面） ----
app.post('/api/delete-page', authMiddleware, async (c) => {
  const body = (c as any).get('body') as { path: string };
  const { category, slug } = parsePath(body.path);

  // 删除 KV 内容
  await c.env.NOTES_CONTENT.delete(`content/${category}/${slug}`).catch(() => {});
  // 删除所有子页面
  await c.env.DB.prepare('DELETE FROM notes WHERE category = ? AND slug LIKE ?')
    .bind(category, slug + '/%').run();
  // 删除页面本身
  await c.env.DB.prepare('DELETE FROM notes WHERE category = ? AND slug = ?')
    .bind(category, slug).run();
  // 删除最近记录
  await c.env.DB.prepare('DELETE FROM recent_files WHERE path = ?').bind(body.path).run();

  return c.json({ success: true });
});

// ---- POST /api/rename-page — 重命名页面 ----
app.post('/api/rename-page', authMiddleware, async (c) => {
  const body = (c as any).get('body') as { oldPath: string; newPath: string };
  const oldP = parsePath(body.oldPath);
  const newP = parsePath(body.newPath);

  // 更新子页面的 parent_slug（D1 不支持 REPLACE 函数，改用逐条更新）
  const { results: children } = await c.env.DB.prepare(
    'SELECT slug FROM notes WHERE category = ? AND parent_slug = ?'
  ).bind(oldP.category, oldP.slug).all<{ slug: string }>();

  for (const child of children) {
    const newChildSlug = newP.slug + '/' + child.slug.split('/').pop();
    await c.env.DB.prepare(
      'UPDATE notes SET slug = ?, category = ?, parent_slug = ? WHERE category = ? AND slug = ?'
    ).bind(newChildSlug, newP.category, newP.slug, oldP.category, child.slug).run();
  }

  // 更新页面本身
  await c.env.DB.prepare(
    'UPDATE notes SET slug = ?, category = ? WHERE category = ? AND slug = ?'
  ).bind(newP.slug, newP.category, oldP.category, oldP.slug).run();

  // 更新最近文件
  await c.env.DB.prepare(
    'UPDATE recent_files SET path = ? WHERE path = ?'
  ).bind(body.newPath, body.oldPath).run();

  return c.json({ success: true });
});

// ---- POST /api/move-page — 移动页面 ----
app.post('/api/move-page', authMiddleware, async (c) => {
  const body = (c as any).get('body') as { oldPath: string; newPath: string };
  const oldP = parsePath(body.oldPath);
  const newP = parsePath(body.newPath);

  // 更新页面本身的 category, slug, parent_slug
  await c.env.DB.prepare(
    'UPDATE notes SET slug = ?, category = ?, parent_slug = ? WHERE category = ? AND slug = ?'
  ).bind(newP.slug, newP.category, getParentSlug(newP.slug), oldP.category, oldP.slug).run();

  // 迁移子页面
  const { results: children } = await c.env.DB.prepare(
    'SELECT slug FROM notes WHERE category = ? AND parent_slug = ?'
  ).bind(oldP.category, oldP.slug).all<{ slug: string }>();

  for (const child of children) {
    const newChildSlug = newP.slug + '/' + child.slug.split('/').pop();
    await c.env.DB.prepare(
      'UPDATE notes SET slug = ?, category = ?, parent_slug = ? WHERE category = ? AND slug = ?'
    ).bind(newChildSlug, newP.category, newP.slug, oldP.category, child.slug).run();
  }

  return c.json({ success: true });
});

// ---- GET /api/recent — 最近文件列表 ----
app.get('/api/recent', async (c) => {
  await ensureSchema(c.env.DB);
  const { results } = await c.env.DB.prepare(
    'SELECT path, title, category, time FROM recent_files ORDER BY time DESC LIMIT 50'
  ).all<{ path: string; title: string; category: string; time: number }>();
  return c.json(results);
});

// ---- POST /api/recent-delete — 删除最近文件记录 ----
app.post('/api/recent-delete', authMiddleware, async (c) => {
  const body = (c as any).get('body') as { path: string };
  await c.env.DB.prepare('DELETE FROM recent_files WHERE path = ?').bind(body.path).run();
  return c.json({ success: true });
});

// ---- GET /api/music-list — 音乐列表 ----
app.get('/api/music-list', async (c) => {
  return c.json(['/music/waltz-for-debby.mp3']);
});

// ---- POST /api/upload-image — 上传图片存 KV ----
app.post('/api/upload-image', async (c) => {
  const formData = await c.req.formData();
  const token = formData.get('token') as string;
  if (!validateToken(token || '')) {
    return c.json({ error: 'not authenticated' }, 403);
  }
  const file = formData.get('file') as File;
  if (!file) return c.json({ error: 'no file' }, 400);

  const ext = file.name.split('.').pop() || 'png';
  const key = `img/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const buffer = await file.arrayBuffer();

  await c.env.NOTES_CONTENT.put(key, buffer);
  return c.json({ success: true, url: `/api/images/${key}` });
});

// ---- GET /api/images/* — 从 KV 返回图片 ----
app.get('/api/images/*', async (c) => {
  const key = c.req.path.replace('/api/images/', '');
  const data = await c.env.NOTES_CONTENT.get(key, 'arrayBuffer');
  if (!data) return c.notFound();

  const ext = key.split('.').pop() || 'png';
  const mimeTypes: Record<string, string> = {
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
    gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
  };
  return c.body(data as ArrayBuffer, { headers: { 'Content-Type': mimeTypes[ext] || 'image/png', 'Cache-Control': 'public, max-age=31536000' } });
});

export default app;
