import { Hono } from 'hono';
import { DB } from '../db';
import { validateToken } from '../auth';
import { extractTitle, getParentSlug, parsePath } from '../helpers';
import type { Env } from '../types';

const pages = new Hono<{ Bindings: Env }>();

// Auth 中间件
async function authMiddleware(c: any, next: any) {
  const body = await c.req.json().catch(() => ({}));
  if (!validateToken(body.token || '')) {
    return c.json({ success: false, error: 'not authenticated' }, 403);
  }
  c.set('body', body);
  await next();
}

// GET /api/pages/:category — 获取分类下页面列表
pages.get('/pages/:category', async (c) => {
  const db = new DB(c.env);
  const category = c.req.param('category');
  const rows = await db.getPagesByCategory(category);

  const slugsWithChildren = new Set<string>();
  for (const r of rows) {
    if (r.parent_slug) slugsWithChildren.add(r.parent_slug);
  }
  const result = rows.map(r => ({
    slug: r.slug,
    title: r.title,
    parentSlug: r.parent_slug,
    sortOrder: r.sort_order,
    hasChildren: slugsWithChildren.has(r.slug),
  }));
  return c.json({ pages: result });
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

  await db.upsertNote({
    slug,
    category,
    title,
    content: body.content,
    parent_slug: getParentSlug(slug),
    sort_order: 0,
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

  await db.upsertNote({
    slug,
    category,
    title,
    content: htmlContent,
    parent_slug: getParentSlug(slug),
    sort_order: 0,
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

export { pages };
