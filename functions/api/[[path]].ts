// Pixel Notes API — 单文件处理所有 /api/* 请求

let tokens = new Set<string>();

function genToken() { const t = 'pxl_' + crypto.randomUUID().slice(0,16); tokens.add(t); return t; }
function checkToken(t: string) { return tokens.has(t); }
function delToken(t: string) { tokens.delete(t); }

async function sha256(s: string) {
  const d = new TextEncoder().encode(s);
  const h = await crypto.subtle.digest('SHA-256', d);
  return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2,'0')).join('');
}
async function hashPw(pw: string) { const s = crypto.randomUUID(); return s + ':' + await sha256(s + pw); }
async function verifyPw(pw: string, hash: string) {
  const [s, e] = hash.split(':'); return s && e && await sha256(s + pw) === e;
}
function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
function parsePath(p: string) {
  const c = p.replace(/\\/g,'/').replace(/^src\/content\//,'').replace(/\.html$/,'');
  const i = c.indexOf('/');
  return i === -1 ? { category: c, slug: c } : { category: c.slice(0,i), slug: c.slice(i+1) };
}
function extractTitle(c: string) { const m = c.match(/<h1[^>]*>(.+?)<\/h1>/i); return m ? m[1].replace(/<[^>]+>/g,'').trim() : 'Untitled'; }
function getParentSlug(s: string) { const p = s.split('/'); return p.length > 1 ? p.slice(0,-1).join('/') : null; }

// ------- 主路由 -------
export const onRequest: PagesFunction<{ DB: D1Database; NOTES_CONTENT: KVNamespace }> = async (ctx) => {
  const url = new URL(ctx.request.url);
  const path = url.pathname;
  const method = ctx.request.method;

  try {

  // POST /api/login
  if (path === '/api/login' && method === 'POST') {
    const { password } = await ctx.request.json();
    if (!password) return json({ error: 'no password' }, 400);
    const row = await ctx.env.DB.prepare("SELECT value FROM settings WHERE key='password_hash'").first<{value:string}>();
    if (!row) {
      const h = await hashPw(password);
      await ctx.env.DB.prepare("INSERT INTO settings (key,value) VALUES ('password_hash',?)").bind(h).run();
      return json({ success: true, token: genToken() });
    }
    if (await verifyPw(password, row.value)) return json({ success: true, token: genToken() });
    return json({ success: false, error: 'wrong password' }, 401);
  }

  // POST /api/logout
  if (path === '/api/logout' && method === 'POST') {
    const { token } = await ctx.request.json();
    delToken(token || '');
    return json({ success: true });
  }

  // GET /api/pages/:category
  const pagesMatch = path.match(/^\/api\/pages\/([^/]+)$/);
  if (pagesMatch && method === 'GET') {
    const cat = decodeURIComponent(pagesMatch[1]);
    const allRows = await ctx.env.DB.prepare('SELECT category FROM notes LIMIT 3').all<{category:string}>();
    const { results } = await ctx.env.DB.prepare(
      'SELECT slug,title,parent_slug,sort_order FROM notes WHERE category=? ORDER BY sort_order'
    ).bind(cat).all<{slug:string;title:string;parent_slug:string|null;sort_order:number}>();
    const hasKids = new Set<string>();
    for (const r of results) if (r.parent_slug) hasKids.add(r.parent_slug);
    return json({ cat, allCategories: allRows.results.map(r=>r.category), count: results.length, pages: results.map(r => ({ slug: r.slug, title: r.title, parentSlug: r.parent_slug, sortOrder: r.sort_order, hasChildren: hasKids.has(r.slug) })) });
  }

  // GET /api/pages/:category/:slug
  const pageMatch = path.match(/^\/api\/pages\/([^/]+)\/(.+)$/);
  if (pageMatch && method === 'GET') {
    const cat = decodeURIComponent(pageMatch[1]);
    const slug = decodeURIComponent(pageMatch[2]);
    const row = await ctx.env.DB.prepare(
      'SELECT slug,title,content,parent_slug,updated_at FROM notes WHERE category=? AND slug=?'
    ).bind(cat, slug).first<{slug:string;title:string;content:string;parent_slug:string|null;updated_at:number}>();
    if (!row) return json({ error: 'not found' }, 404);
    const kv = await ctx.env.NOTES_CONTENT.get(`content/${cat}/${slug}`);
    return json({ slug: row.slug, title: row.title, content: kv || row.content, parentSlug: row.parent_slug, updatedAt: row.updated_at });
  }

  // POST /api/save
  if (path === '/api/save' && method === 'POST') {
    const body = await ctx.request.json();
    if (!checkToken(body.token || '')) return json({ error: 'not authenticated' }, 403);
    const { category, slug } = parsePath(body.path);
    const title = extractTitle(body.content);
    const now = Date.now();
    const TH = 90 * 1024;
    await ctx.env.DB.prepare(
      `INSERT OR REPLACE INTO notes (slug,category,title,content,parent_slug,sort_order,updated_at) VALUES (?,?,?,?,?,COALESCE((SELECT sort_order FROM notes WHERE slug=? AND category=?),0),?)`
    ).bind(slug, category, title, body.content.length > TH ? '' : body.content, getParentSlug(slug), slug, category, now).run();
    if (body.content.length > TH) await ctx.env.NOTES_CONTENT.put(`content/${category}/${slug}`, body.content);
    else await ctx.env.NOTES_CONTENT.delete(`content/${category}/${slug}`).catch(()=>{});
    await ctx.env.DB.prepare('INSERT OR REPLACE INTO recent_files (path,title,category,time) VALUES (?,?,?,?)').bind(body.path, title, category, now).run();
    return json({ success: true });
  }

  // POST /api/create-page
  if (path === '/api/create-page' && method === 'POST') {
    const body = await ctx.request.json();
    if (!checkToken(body.token || '')) return json({ error: 'not authenticated' }, 403);
    const { category, slug } = parsePath(body.path);
    const html = body.content || `<h1>${slug.split('/').pop()}</h1>\n<p></p>`;
    await ctx.env.DB.prepare('INSERT INTO notes (slug,category,title,content,parent_slug,sort_order,updated_at) VALUES (?,?,?,?,?,0,?)').bind(slug, category, extractTitle(html), html, getParentSlug(slug), Date.now()).run();
    return json({ success: true });
  }

  // POST /api/delete-page
  if (path === '/api/delete-page' && method === 'POST') {
    const body = await ctx.request.json();
    if (!checkToken(body.token || '')) return json({ error: 'not authenticated' }, 403);
    const { category, slug } = parsePath(body.path);
    await ctx.env.NOTES_CONTENT.delete(`content/${category}/${slug}`).catch(()=>{});
    await ctx.env.DB.prepare('DELETE FROM notes WHERE category=? AND slug LIKE ?').bind(category, slug+'/%').run();
    await ctx.env.DB.prepare('DELETE FROM notes WHERE category=? AND slug=?').bind(category, slug).run();
    await ctx.env.DB.prepare('DELETE FROM recent_files WHERE path=?').bind(body.path).run();
    return json({ success: true });
  }

  // POST /api/rename-page
  if (path === '/api/rename-page' && method === 'POST') {
    const body = await ctx.request.json();
    if (!checkToken(body.token || '')) return json({ error: 'not authenticated' }, 403);
    const o = parsePath(body.oldPath), n = parsePath(body.newPath);
    const kids = await ctx.env.DB.prepare('SELECT slug FROM notes WHERE category=? AND parent_slug=?').bind(o.category, o.slug).all<{slug:string}>();
    for (const k of kids.results) {
      const ns = n.slug + '/' + k.slug.split('/').pop();
      await ctx.env.DB.prepare('UPDATE notes SET slug=?,category=?,parent_slug=? WHERE category=? AND slug=?').bind(ns, n.category, n.slug, o.category, k.slug).run();
    }
    await ctx.env.DB.prepare('UPDATE notes SET slug=?,category=? WHERE category=? AND slug=?').bind(n.slug, n.category, o.category, o.slug).run();
    await ctx.env.DB.prepare('UPDATE recent_files SET path=? WHERE path=?').bind(body.newPath, body.oldPath).run();
    return json({ success: true });
  }

  // POST /api/move-page
  if (path === '/api/move-page' && method === 'POST') {
    const body = await ctx.request.json();
    if (!checkToken(body.token || '')) return json({ error: 'not authenticated' }, 403);
    const o = parsePath(body.oldPath), n = parsePath(body.newPath);
    await ctx.env.DB.prepare('UPDATE notes SET slug=?,category=?,parent_slug=? WHERE category=? AND slug=?').bind(n.slug, n.category, getParentSlug(n.slug), o.category, o.slug).run();
    const kids = await ctx.env.DB.prepare('SELECT slug FROM notes WHERE category=? AND parent_slug=?').bind(o.category, o.slug).all<{slug:string}>();
    for (const k of kids.results) {
      const ns = n.slug + '/' + k.slug.split('/').pop();
      await ctx.env.DB.prepare('UPDATE notes SET slug=?,category=?,parent_slug=? WHERE category=? AND slug=?').bind(ns, n.category, n.slug, o.category, k.slug).run();
    }
    return json({ success: true });
  }

  // GET /api/recent
  if (path === '/api/recent' && method === 'GET') {
    const { results } = await ctx.env.DB.prepare('SELECT path,title,category,time FROM recent_files ORDER BY time DESC LIMIT 50').all();
    return json(results);
  }

  // POST /api/recent-delete
  if (path === '/api/recent-delete' && method === 'POST') {
    const body = await ctx.request.json();
    if (!checkToken(body.token || '')) return json({ error: 'not authenticated' }, 403);
    await ctx.env.DB.prepare('DELETE FROM recent_files WHERE path=?').bind(body.path).run();
    return json({ success: true });
  }

  // GET /api/music-list
  if (path === '/api/music-list' && method === 'GET') {
    return json(['/music/waltz-for-debby.mp3']);
  }

  // POST /api/upload-image
  if (path === '/api/upload-image' && method === 'POST') {
    const fd = await ctx.request.formData();
    if (!checkToken((fd.get('token') as string) || '')) return json({ error: 'not authenticated' }, 403);
    const file = fd.get('file') as File;
    if (!file) return json({ error: 'no file' }, 400);
    const ext = file.name.split('.').pop() || 'png';
    const key = `img/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
    await ctx.env.NOTES_CONTENT.put(key, await file.arrayBuffer());
    return json({ success: true, url: `/api/img/${key}` });
  }

  // GET /api/img/*
  const imgMatch = path.match(/^\/api\/img\/(.+)$/);
  if (imgMatch && method === 'GET') {
    const key = 'img/' + imgMatch[1];
    const data = await ctx.env.NOTES_CONTENT.get(key, 'arrayBuffer');
    if (!data) return new Response('Not Found', { status: 404 });
    const ext = key.split('.').pop() || 'png';
    const mime: Record<string,string> = { png:'image/png', jpg:'image/jpeg', jpeg:'image/jpeg', gif:'image/gif', webp:'image/webp', svg:'image/svg+xml' };
    return new Response(data as ArrayBuffer, { headers: { 'Content-Type': mime[ext] || 'image/png', 'Cache-Control': 'public, max-age=31536000' } });
  }

  return new Response('Not Found', { status: 404 });

  } catch (e: any) {
    return json({ error: e.message, stack: e.stack }, 500);
  }
};
