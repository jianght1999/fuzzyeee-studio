import { Hono } from 'hono';
import { DB } from '../db';
import { validateToken, ensureTokensLoaded } from '../auth';
import { extractTitle, getParentSlug, parsePath } from '../helpers';
import type { Env } from '../types';

const pages = new Hono<{ Bindings: Env }>();

// Auth 中间件
async function authMiddleware(c: any, next: any) {
  const db = new DB(c.env);
  await ensureTokensLoaded(db); // 冷启动后从 DB 恢复 token
  const body = await c.req.json().catch(() => ({}));
  if (!validateToken(body.token || '')) {
    return c.json({ success: false, error: 'not authenticated' }, 403);
  }
  c.set('body', body);
  await next();
}

// GET /api/pages/:category — 获取分类下页面列表
pages.get('/pages/:category', async (c) => {
  try {
    const db = new DB(c.env);
    const category = c.req.param('category');
    const rows = await db.getPagesByCategory(category);

  const slugsWithChildren = new Set<string>();
  for (const r of rows) {
    if (r.parent_slug) slugsWithChildren.add(r.parent_slug);
  }
  // 过滤掉 .order.json
  const filtered = rows.filter(r => !r.slug.endsWith('.order.json'));
  const result = filtered.map(r => ({
    slug: r.slug,
    title: r.title,
    parentSlug: r.parent_slug,
    sortOrder: r.sort_order,
    hasChildren: slugsWithChildren.has(r.slug),
  }));
  return c.json({ pages: result });
  } catch (err: any) {
    return c.json({ error: err.message || 'unknown', stack: err.stack }, 500);
  }
});

// GET /api/pages/:category/:slug{.*} — 获取单篇内容
pages.get('/pages/:category/:slug{.*}', async (c) => {
  const db = new DB(c.env);
  const category = c.req.param('category');
  let slug = c.req.param('slug');
  if (slug.startsWith('/')) slug = slug.slice(1);

  const row = await db.getPageBySlug(category, slug);
  if (!row) return c.json({ error: 'not found' }, 404);

  return c.json({
    slug: row.slug,
    title: row.title,
    content: row.content,
    parentSlug: row.parent_slug,
    updatedAt: row.updated_at,
  });
});

// POST /api/save — 保存笔记
pages.post('/save', authMiddleware, async (c) => {
  const db = new DB(c.env);
  const body = (c as any).get('body') as { path: string; content: string };
  const { category, slug } = parsePath(body.path);
  const title = extractTitle(body.content);
  const now = Date.now();

  // 保留已有 sort_order（改名等操作会先改 slug 再调 save，不能重置为 0）
  const existing = await db.getPageBySlug(category, slug);
  const sortOrder = existing?.sort_order ?? 0;

  await db.upsertNote({
    slug,
    category,
    title,
    content: body.content,
    parent_slug: getParentSlug(slug),
    sort_order: sortOrder,
    updated_at: now,
  });

  await db.upsertRecent(body.path, title, category, now);

  return c.json({ success: true });
});

// POST /api/create-page — 创建新页面
pages.post('/create-page', authMiddleware, async (c) => {
  const db = new DB(c.env);
  const body = (c as any).get('body') as { path: string; content?: string };
  const { category, slug } = parsePath(body.path);

  const htmlContent = body.content || `<h1>${slug.split('/').pop()}</h1>\n<p></p>`;
  const title = extractTitle(htmlContent);
  const now = Date.now();
  const parentSlug = getParentSlug(slug);

  // 将新页面的 sort_order 设为同组末尾，避免打乱已有顺序
  let sortOrder = 0;
  try {
    const countRows = parentSlug
      ? await db.query<{ cnt: number }>(
          'SELECT count(*) as cnt FROM notes WHERE category = ? AND parent_slug = ?',
          [category, parentSlug],
        )
      : await db.query<{ cnt: number }>(
          'SELECT count(*) as cnt FROM notes WHERE category = ? AND parent_slug IS NULL',
          [category],
        );
    sortOrder = Number(countRows[0]?.cnt) || 0;
  } catch { /* fallback to 0 */ }

  await db.upsertNote({
    slug,
    category,
    title,
    content: htmlContent,
    parent_slug: parentSlug,
    sort_order: sortOrder,
    updated_at: now,
  });

  return c.json({ success: true });
});

// POST /api/delete-page — 删除页面（含子页面）
pages.post('/delete-page', authMiddleware, async (c) => {
  const db = new DB(c.env);
  const body = (c as any).get('body') as { path: string };
  const { category, slug } = parsePath(body.path);

  await db.deleteNoteAndChildren(category, slug);
  await db.deleteRecent(body.path);

  return c.json({ success: true });
});

// POST /api/rename-page — 重命名页面
pages.post('/rename-page', authMiddleware, async (c) => {
  const db = new DB(c.env);
  const body = (c as any).get('body') as { oldPath: string; newPath: string };
  const oldP = parsePath(body.oldPath);
  const newP = parsePath(body.newPath);

  // 更新子页面的 slug（父路径变了）
  const children = await db.getChildren(oldP.category, oldP.slug);
  for (const child of children) {
    const newChildSlug = newP.slug + '/' + child.slug.split('/').pop();
    await db.updateNoteSlug(oldP.category, child.slug, newP.category, newChildSlug);
  }

  // 更新页面本身
  await db.updateNoteSlug(oldP.category, oldP.slug, newP.category, newP.slug);

  return c.json({ success: true });
});

// POST /api/move-page — 移动页面
pages.post('/move-page', authMiddleware, async (c) => {
  const db = new DB(c.env);
  const body = (c as any).get('body') as { oldPath: string; newPath: string };
  const oldP = parsePath(body.oldPath);
  const newP = parsePath(body.newPath);

  // 更新页面本身的 category, slug, parent_slug
  await db.updateNoteSlugAndParent(
    oldP.category, oldP.slug,
    newP.category, newP.slug,
    getParentSlug(newP.slug)
  );

  // 迁移子页面
  const children = await db.getChildren(oldP.category, oldP.slug);
  for (const child of children) {
    const newChildSlug = newP.slug + '/' + child.slug.split('/').pop();
    await db.updateNoteSlugAndParent(
      oldP.category, child.slug,
      newP.category, newChildSlug,
      newP.slug
    );
  }

  return c.json({ success: true });
});

// POST /api/reorder — 更新排序
pages.post('/reorder', authMiddleware, async (c) => {
  const db = new DB(c.env);
  const body = (c as any).get('body') as { category: string; parentSlug?: string; slugs: string[] };
  for (let i = 0; i < body.slugs.length; i++) {
    const slug = body.parentSlug ? `${body.parentSlug}/${body.slugs[i]}` : body.slugs[i];
    await db.query('UPDATE notes SET sort_order = ? WHERE category = ? AND slug = ?',
      [i, body.category, slug]);
  }
  return c.json({ success: true });
});

export { pages };
