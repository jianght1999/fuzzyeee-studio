import { Hono } from 'hono';
import { DB } from '../db';
import { validateToken, ensureTokensLoaded } from '../auth';
import type { Env } from '../types';

const images = new Hono<{ Bindings: Env }>();

// POST /api/upload-image — 上传图片（base64 存 TiDB）
images.post('/upload-image', async (c) => {
  const formData = await c.req.formData();
  const db = new DB(c.env);
  await ensureTokensLoaded(db);
  const token = formData.get('token') as string;
  if (!validateToken(token || '')) {
    return c.json({ error: 'not authenticated' }, 403);
  }
  const file = formData.get('file') as File;
  if (!file) return c.json({ error: 'no file' }, 400);

  // 将图片转为 base64 存储（分块处理，避免大图参数溢出）
  const bytes = new Uint8Array(await file.arrayBuffer());
  const chunks: string[] = [];
  for (let i = 0; i < bytes.length; i += 8192) {
    chunks.push(String.fromCharCode(...bytes.subarray(i, i + 8192)));
  }
  const base64 = btoa(chunks.join(''));
  const ext = file.name.split('.').pop() || 'png';
  const dataUrl = `data:image/${ext};base64,${base64}`;

  const key = `img/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  await db.setSetting(key, dataUrl);

  return c.json({ success: true, url: `/api/${key}` });
});

// GET /api/img/* — 获取图片
images.get('/img/*', async (c) => {
  const db = new DB(c.env);
  const key = c.req.path.replace('/api/', '');
  const dataUrl = await db.getSetting(key);
  if (!dataUrl) return c.notFound();

  // 解析 data URL 返回二进制
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return c.json({ error: 'invalid image data' }, 500);

  const mimeType = match[1];
  const binary = Uint8Array.from(atob(match[2]), c => c.charCodeAt(0));

  return c.body(binary, {
    headers: {
      'Content-Type': mimeType,
      'Cache-Control': 'public, max-age=31536000',
    },
  });
});

export { images };
