# Cloudflare Workers + D1 Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate pixel-notes blog from static build-time content (import.meta.glob) to dynamic runtime content served via Cloudflare Workers + D1, with all editing features working online.

**Architecture:** Cloudflare Worker handles all `/api/*` routes → D1 stores notes/settings/recent. React frontend fetches page lists and content via fetch() instead of import.meta.glob. Local dev keeps Vite plugin for API; production uses Worker. A one-time migration script imports 93 existing notes into D1.

**Tech Stack:** Cloudflare Workers, D1 (SQLite), React 19, TypeScript, Vite 8, Hono (lightweight Worker router)

---

## File Map

```
Create:
  workers/package.json            — Worker dependencies (hono, bcryptjs)
  workers/tsconfig.json           — Worker TypeScript config
  workers/wrangler.toml           — D1 binding + deploy config
  workers/src/index.ts            — API routes (auth, CRUD, recent, music)
  scripts/migrate-to-d1.mjs       — One-time content → D1 import

Modify:
  src/hooks/useMarkdownPages.ts   — import.meta.glob → fetch API
  src/pages/NotePage.tsx           — Add content fetching on page select
  src/components/RecentDropdown/RecentDropdown.tsx — Minor path format adaptation
  src/data/categories.ts           — Simplify image paths
  vite.config.ts                   — Add dev proxy for /api/* → Worker or keep plugin
  package.json                     — Add scripts for worker dev
```

---

### Task 1: Worker Project Setup

**Files:**
- Create: `workers/package.json`
- Create: `workers/tsconfig.json`
- Create: `workers/wrangler.toml`

- [ ] **Step 1: Create workers/package.json**

```json
{
  "name": "pixel-notes-worker",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy"
  },
  "dependencies": {
    "hono": "^4.6.5",
    "bcryptjs": "^2.4.3"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20250701.0",
    "wrangler": "^4.1.0"
  }
}
```

- [ ] **Step 2: Create workers/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "es2022",
    "module": "es2022",
    "moduleResolution": "bundler",
    "lib": ["es2022"],
    "types": ["@cloudflare/workers-types"],
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create workers/wrangler.toml**

```toml
name = "pixel-notes-api"
main = "src/index.ts"
compatibility_date = "2025-07-01"

[[d1_databases]]
binding = "DB"
database_name = "pixel-notes-db"
database_id = ""  # Fill after `wrangler d1 create pixel-notes-db`

[observability]
enabled = true
```

- [ ] **Step 4: Install Worker dependencies**

Run: `cd workers && npm install`

Expected: dependencies installed without errors.

- [ ] **Step 5: Commit**

```bash
git add workers/
git commit -m "chore: scaffold Cloudflare Worker project"
```

---

### Task 2: D1 Database Definition

**Files:**
- Modify: `workers/src/index.ts` (add D1 schema init)

- [ ] **Step 1: Create workers/src/schema.ts — DDL statements**

```typescript
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS notes (
  slug        TEXT PRIMARY KEY,
  category    TEXT NOT NULL,
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  parent_slug TEXT,
  sort_order  INTEGER DEFAULT 0,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS recent_files (
  path     TEXT PRIMARY KEY,
  title    TEXT NOT NULL,
  category TEXT NOT NULL,
  time     INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notes_category ON notes(category);
CREATE INDEX IF NOT EXISTS idx_notes_parent  ON notes(parent_slug);
`;
```

- [ ] **Step 2: Add schema init to Worker entry**

In `workers/src/index.ts`, call `db.exec(SCHEMA_SQL)` on first request (or via a dedicated init). Since D1 doesn't support `exec()` with multiple statements in a single call, use `db.batch()` with individual statements. Actually for Workers format, we'll run them one at a time via `db.prepare(...).run()`.

We'll handle schema initialization in the Worker's `fetch` handler on first invocation, checking a `schema_version` setting.

- [ ] **Step 3: Commit**

```bash
git add workers/src/schema.ts workers/src/index.ts
git commit -m "feat: add D1 schema definition"
```

---

### Task 3: Worker API — Auth Endpoints

**Files:**
- Create/modify: `workers/src/index.ts`
- Create: `workers/src/auth.ts`

- [ ] **Step 1: Create workers/src/auth.ts — password hashing & token management**

```typescript
import { hashSync, compareSync } from 'bcryptjs';

// In-memory token store (resets on Worker cold start, acceptable for personal blog)
const tokens = new Set<string>();

export function generateToken(): string {
  const t = 'pixel_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  tokens.add(t);
  return t;
}

export function validateToken(t: string): boolean {
  return tokens.has(t);
}

export function invalidateToken(t: string): void {
  tokens.delete(t);
}

export function hashPassword(pw: string): string {
  return hashSync(pw, 10);
}

export function verifyPassword(pw: string, hash: string): boolean {
  return compareSync(pw, hash);
}
```

- [ ] **Step 2: Create workers/src/index.ts — Hono app with login/logout routes**

```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { generateToken, validateToken, invalidateToken, hashPassword, verifyPassword } from './auth';
import { SCHEMA_SQL } from './schema';

type Env = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Env }>();

// CORS for local dev
app.use('*', cors());

// --- Schema init helper ---
async function ensureSchema(db: D1Database): Promise<void> {
  const v = await db.prepare("SELECT value FROM settings WHERE key = 'schema_version'").first<{ value: string }>();
  if (v?.value === '1') return;

  const stmts = SCHEMA_SQL.split(';').map(s => s.trim()).filter(Boolean);
  const batch = stmts.map(sql => db.prepare(sql));
  // Execute sequentially since D1 batch needs explicit binding
  for (const stmt of batch) {
    await stmt.run();
  }
  await db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '1')").run();
}

// --- Auth middleware ---
async function authMiddleware(c: any, next: any) {
  const body = await c.req.json().catch(() => ({}));
  if (!validateToken(body.token || '')) {
    return c.json({ success: false, error: 'not authenticated' }, 403);
  }
  c.set('body', body);
  await next();
}

// --- POST /api/login ---
app.post('/api/login', async (c) => {
  await ensureSchema(c.env.DB);
  const { password } = await c.req.json<{ password: string }>();

  // First login: generate and store password hash
  let stored = await c.env.DB.prepare("SELECT value FROM settings WHERE key = 'password_hash'").first<{ value: string }>();
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

// --- POST /api/logout ---
app.post('/api/logout', async (c) => {
  const { token } = await c.req.json<{ token: string }>();
  invalidateToken(token);
  return c.json({ success: true });
});

export default app;
```

- [ ] **Step 3: Commit**

```bash
git add workers/src/
git commit -m "feat: add auth endpoints (login/logout) to Worker"
```

---

### Task 4: Worker API — Content CRUD Endpoints

**Files:**
- Modify: `workers/src/index.ts`

- [ ] **Step 1: Add GET /api/pages/:category — list pages in category**

```typescript
app.get('/api/pages/:category', async (c) => {
  await ensureSchema(c.env.DB);
  const category = c.req.param('category');
  const { results } = await c.env.DB.prepare(
    'SELECT slug, title, parent_slug as parentSlug, sort_order as sortOrder FROM notes WHERE category = ? ORDER BY sort_order ASC'
  ).bind(category).all<{ slug: string; title: string; parentSlug: string | null; sortOrder: number }>();

  // Compute hasChildren
  const slugsWithChildren = new Set<string>();
  for (const r of results) {
    if (r.parentSlug) slugsWithChildren.add(r.parentSlug);
  }
  const pages = results.map(r => ({
    ...r,
    hasChildren: slugsWithChildren.has(r.slug),
  }));
  return c.json({ pages });
});
```

- [ ] **Step 2: Add GET /api/pages/:category/:slug — get single page content**

Note: D1 slug contains full path like `Comping/drop 2`. The URL path includes category, so the slug parameter captures the rest. But the URL pattern `/api/pages/:category/:slug` won't match slugs with `/`. Use `*` wildcard instead.

```typescript
app.get('/api/pages/:category/:slug{.*}', async (c) => {
  await ensureSchema(c.env.DB);
  const category = c.req.param('category');
  let slug = c.req.param('slug');
  // Remove leading slash if present (from wildcard match)
  if (slug.startsWith('/')) slug = slug.slice(1);
  
  const row = await c.env.DB.prepare(
    'SELECT slug, title, content, parent_slug as parentSlug, updated_at as updatedAt FROM notes WHERE category = ? AND slug = ?'
  ).bind(category, slug).first<{ slug: string; title: string; content: string; parentSlug: string | null; updatedAt: number }>();

  if (!row) return c.json({ error: 'not found' }, 404);
  return c.json(row);
});
```

- [ ] **Step 3: Add POST /api/save — save page content**

```typescript
app.post('/api/save', authMiddleware, async (c) => {
  const { path, content } = c.get('body') as { path: string; content: string };
  // path format: "src/content/{category}/{slug}.html"
  const parts = path.replace(/\\/g, '/').replace(/^src\/content\//, '').replace(/\.html$/, '').split('/');
  const category = parts[0];
  const slug = parts.slice(1).join('/') || parts[0];
  // If slug is same as category (root page like "guitar/Comping.html"), adjust
  const actualSlug = parts.length === 1 ? parts[0] : parts.slice(1).join('/');
  // Wait — re-examine: the path for a root page like "guitar/Blues.html" is:
  // src/content/guitar/Blues.html → category=guitar, slug=Blues
  // For subpage "guitar/Comping/drop 2.html":
  // src/content/guitar/Comping/drop 2.html → category=guitar, slug=Comping/drop 2
  const actualCategory = parts[0];
  const actualSlug2 = parts.length > 2 ? parts.slice(1).join('/') : parts[1];

  const title = extractTitle(content);
  const now = Date.now();

  await c.env.DB.prepare(
    `INSERT OR REPLACE INTO notes (slug, category, title, content, parent_slug, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(actualSlug2, actualCategory, title, content, getParentSlug(actualSlug2), now).run();

  // Update recent_files
  await c.env.DB.prepare(
    `INSERT OR REPLACE INTO recent_files (path, title, category, time) VALUES (?, ?, ?, ?)`
  ).bind(path, title, actualCategory, now).run();

  return c.json({ success: true });
});
```

Helper functions:

```typescript
function extractTitle(content: string): string {
  const m = content.match(/<h1[^>]*>(.+?)<\/h1>/i);
  return m ? m[1].replace(/<[^>]+>/g, '').trim() : 'Untitled';
}

function getParentSlug(slug: string): string | null {
  const parts = slug.split('/');
  return parts.length > 1 ? parts.slice(0, -1).join('/') : null;
}
```

- [ ] **Step 4: Add POST /api/create-page**

```typescript
app.post('/api/create-page', authMiddleware, async (c) => {
  const { path, content } = c.get('body') as { path: string; content?: string };
  const parts = path.replace(/\\/g, '/').replace(/^src\/content\//, '').replace(/\.html$/, '').split('/');
  const category = parts[0];
  const slug = parts.length > 2 ? parts.slice(1).join('/') : parts[1];

  const htmlContent = content || `<h1>${slug.split('/').pop()}</h1>\n<p></p>`;
  const title = extractTitle(htmlContent);
  const now = Date.now();

  await c.env.DB.prepare(
    `INSERT INTO notes (slug, category, title, content, parent_slug, sort_order, updated_at)
     VALUES (?, ?, ?, ?, ?, 0, ?)`
  ).bind(slug, category, title, htmlContent, getParentSlug(slug), now).run();

  return c.json({ success: true });
});
```

- [ ] **Step 5: Add POST /api/delete-page**

```typescript
app.post('/api/delete-page', authMiddleware, async (c) => {
  const { path } = c.get('body') as { path: string };
  const parts = path.replace(/\\/g, '/').replace(/^src\/content\//, '').replace(/\.html$/, '').split('/');
  const category = parts[0];
  const slug = parts.length > 2 ? parts.slice(1).join('/') : parts[1];

  // Delete children too
  await c.env.DB.prepare('DELETE FROM notes WHERE category = ? AND slug LIKE ?')
    .bind(category, slug + '/%').run();
  await c.env.DB.prepare('DELETE FROM notes WHERE category = ? AND slug = ?')
    .bind(category, slug).run();
  await c.env.DB.prepare('DELETE FROM recent_files WHERE path = ?').bind(path).run();

  return c.json({ success: true });
});
```

- [ ] **Step 6: Add POST /api/rename-page**

```typescript
app.post('/api/rename-page', authMiddleware, async (c) => {
  const { oldPath, newPath } = c.get('body') as { oldPath: string; newPath: string };
  const parsePath = (p: string) => {
    const parts = p.replace(/\\/g, '/').replace(/^src\/content\//, '').replace(/\.html$/, '').split('/');
    return { category: parts[0], slug: parts.length > 2 ? parts.slice(1).join('/') : parts[1] };
  };
  const oldP = parsePath(oldPath);
  const newP = parsePath(newPath);

  // Update children parent_slug references
  await c.env.DB.prepare(
    "UPDATE notes SET parent_slug = REPLACE(parent_slug, ?, ?) WHERE category = ? AND parent_slug LIKE ?"
  ).bind(oldP.slug, newP.slug, oldP.category, oldP.slug + '%').run();

  // Update the page itself
  await c.env.DB.prepare(
    'UPDATE notes SET slug = ?, category = ? WHERE category = ? AND slug = ?'
  ).bind(newP.slug, newP.category, oldP.category, oldP.slug).run();

  // Update recent_files
  await c.env.DB.prepare(
    'UPDATE recent_files SET path = ? WHERE path = ?'
  ).bind(newPath, oldPath).run();

  return c.json({ success: true });
});
```

- [ ] **Step 7: Add POST /api/move-page**

```typescript
app.post('/api/move-page', authMiddleware, async (c) => {
  const { oldPath, newPath } = c.get('body') as { oldPath: string; newPath: string };
  const parsePath = (p: string) => {
    const parts = p.replace(/\\/g, '/').replace(/^src\/content\//, '').replace(/\.html$/, '').split('/');
    return { category: parts[0], slug: parts.length > 2 ? parts.slice(1).join('/') : parts[1] };
  };
  const oldP = parsePath(oldPath);
  const newP = parsePath(newPath);

  // Update the page's slug, category, and parent_slug
  await c.env.DB.prepare(
    'UPDATE notes SET slug = ?, category = ?, parent_slug = ? WHERE category = ? AND slug = ?'
  ).bind(newP.slug, newP.category, getParentSlug(newP.slug), oldP.category, oldP.slug).run();

  // Move children: update their slugs too
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
```

- [ ] **Step 8: Add recent files + music-list endpoints**

```typescript
// GET /api/recent
app.get('/api/recent', async (c) => {
  await ensureSchema(c.env.DB);
  const { results } = await c.env.DB.prepare(
    'SELECT path, title, category, time FROM recent_files ORDER BY time DESC LIMIT 50'
  ).all<{ path: string; title: string; category: string; time: number }>();
  return c.json(results);
});

// POST /api/recent-delete
app.post('/api/recent-delete', authMiddleware, async (c) => {
  const { path } = c.get('body') as { path: string };
  await c.env.DB.prepare('DELETE FROM recent_files WHERE path = ?').bind(path).run();
  return c.json({ success: true });
});

// GET /api/music-list
app.get('/api/music-list', async (c) => {
  // Music files are still served statically by Pages — return known tracks
  return c.json(['/music/waltz-for-debby.mp3']);
});
```

- [ ] **Step 9: Commit**

```bash
git add workers/src/index.ts
git commit -m "feat: add content CRUD + recent + music endpoints"
```

---

### Task 5: Frontend — Rewrite useMarkdownPages → usePages

**Files:**
- Modify: `src/hooks/useMarkdownPages.ts`
- Modify: `src/pages/NotePage.tsx`

- [ ] **Step 1: Rewrite useMarkdownPages.ts as usePages.ts**

Since the API now returns metadata without content in list, and content on-demand, rename the file and change the hook:

```typescript
// src/hooks/usePages.ts
import { useState, useEffect } from 'react';

export interface Page {
  slug: string;
  title: string;
  content?: string; // undefined when loaded from list
  parentSlug: string | null;
  hasChildren: boolean;
  sortOrder: number;
}

export function usePages(category: string) {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/pages/${category}`)
      .then(r => r.json())
      .then(data => {
        setPages((data.pages || []).map((p: any) => ({
          slug: p.slug,
          title: p.title,
          parentSlug: p.parentSlug,
          hasChildren: p.hasChildren,
          sortOrder: p.sortOrder,
        })));
      })
      .catch(() => setPages([]))
      .finally(() => setLoading(false));
  }, [category]);

  return { pages, loading };
}

export function usePageContent(category: string, slug: string) {
  const [content, setContent] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    setContent(null);
    fetch(`/api/pages/${category}/${encodeURIComponent(slug)}`)
      .then(r => r.json())
      .then(data => setContent(data.content || ''))
      .catch(() => setContent(''));
  }, [category, slug]);

  return content;
}
```

- [ ] **Step 2: Update NotePage.tsx to use new hooks**

Change the import and add content fetching:

```tsx
// Replace: import { useMarkdownPages } from '../hooks/useMarkdownPages';
import { usePages, usePageContent, type Page } from '../hooks/usePages';
```

Replace `const { pages } = useMarkdownPages(category || '');` with:

```tsx
const { pages, loading } = usePages(category || '');
```

Replace the content resolution. Currently:

```tsx
const displayContent = activePage
  ? (editedContent[activePage.slug] ?? activePage.content)
  : '';
```

After:

```tsx
// Fetch content for active page
const fetchedContent = usePageContent(category || '', activeSlug);
const displayContent = activePage
  ? (editedContent[activePage.slug] ?? fetchedContent ?? '')
  : '';
```

Also update `loading` UI in the content area:

```tsx
{loading ? (
  <p className={styles.emptyHint}>loading...</p>
) : activePage ? (
  // ... existing editing/render logic
) : (
  <p className={styles.emptyHint}>请从左侧目录选择一篇笔记</p>
)}
```

- [ ] **Step 3: Update NotePage's handleSave to also use API**

The `handleSave` function currently calls `saveMarkdown` (which uses the Vite plugin API). In production, this now calls the Worker's `/api/save`. The AuthContext `saveMarkdown` already calls `/api/save` — no change needed.

- [ ] **Step 4: Delete old useMarkdownPages.ts**

```bash
rm src/hooks/useMarkdownPages.ts
```

Update any remaining imports. Check:

```bash
grep -r "useMarkdownPages" src/
```

- [ ] **Step 5: Commit**

```bash
git add src/hooks/ src/pages/NotePage.tsx
git rm src/hooks/useMarkdownPages.ts
git commit -m "refactor: replace import.meta.glob with API-based usePages hook"
```

---

### Task 6: Frontend — Update Sidebar Props

**Files:**
- Modify: `src/components/Sidebar/Sidebar.tsx`
- Modify: `src/pages/NotePage.tsx`

- [ ] **Step 1: Update Sidebar's Page import**

Change import from `useMarkdownPages` to `usePages`:

```tsx
// Replace:
import type { Page } from '../../hooks/useMarkdownPages';
// With:
import type { Page } from '../../hooks/usePages';
```

- [ ] **Step 2: Fix Sidebar slug-based child lookup**

The Sidebar's `childrenOf` function uses `page.slug.replace(/^.*\//, '')` to get the leaf name, then finds children with matching `parentSlug`. With the new system, parentSlug uses full path. The Sidebar logic should work as-is since the API returns slugs in the same format.

But wait — the Sidebar `handleMove` and `handleReorder` callbacks (`onMove`, `onReorder`) pass slugs to NotePage which calls the API. These should still work since the Worker API handles path transformations.

- [ ] **Step 3: Commit**

```bash
git add src/components/Sidebar/Sidebar.tsx
git commit -m "fix: update Sidebar Page type import"
```

---

### Task 7: Frontend — Categories & Recent Dropdown

**Files:**
- Modify: `src/data/categories.ts`
- Modify: `src/components/RecentDropdown/RecentDropdown.tsx`

- [ ] **Step 1: Simplify categories.ts image paths**

```typescript
// Remove BASE_URL prefix since base is now '/'
export const categories: Category[] = [
  {
    slug: 'guitar',
    title: 'jazz',
    description: '',
    image: '/images/jazz.png',
    isAvailable: true,
    emoji: '🎷',
  },
  {
    slug: 'synth',
    title: 'crafts',
    description: '',
    image: '/images/crafts.png',
    isAvailable: true,
    emoji: '🎛️',
  },
  {
    slug: 'reading',
    title: 'writing',
    description: '',
    image: '/images/writing.png',
    isAvailable: true,
    emoji: '📚',
  },
  {
    slug: 'coming-soon',
    title: 'coming soon',
    description: '',
    image: '/images/coming-soon.png',
    isAvailable: false,
    emoji: '❓',
  },
];
```

Remove the `const B = import.meta.env.BASE_URL;` line.

- [ ] **Step 2: RecentDropdown already uses fetch('/api/recent') — no change needed**

The `RecentDropdown` component already calls `/api/recent` and `/api/recent-delete` via fetch. The Worker now serves these. No changes needed.

- [ ] **Step 3: Commit**

```bash
git add src/data/categories.ts
git commit -m "refactor: hardcode image paths, remove BASE_URL"
```

---

### Task 8: Dev Experience — Vite Proxy for API

**Files:**
- Modify: `vite.config.ts`

- [ ] **Step 1: Add dev server proxy for /api to Worker**

During local development, the Vite dev server serves the frontend, but API calls to `/api/*` need to reach the Worker. Add a proxy to `vite.config.ts`. The existing Vite plugin provides API handlers for dev mode — keep them as they are. The proxy is only needed if you want to test against the real Worker in dev.

Actually, the cleanest approach: **keep the Vite plugin API for dev mode**. The plugin already handles all API routes by writing to the filesystem. In dev mode, the plugin continues to work on `src/content/` files. In production, the Worker handles everything via D1.

No changes needed in `vite.config.ts` for dev mode. The Vite plugin and Worker are complementary — plugin for local dev, Worker for production.

But wait — if someone runs `npm run dev` and the API works via Vite plugin, then after deploying to Cloudflare the Worker API works. This is the plan. The AuthContext already calls `/api/*` which works in both environments.

- [ ] **Step 2: Ensure clean separation**

The existing Vite plugin's `/api/recent` reads `.recent.json` from filesystem. In production, the Worker reads from D1. The frontend code is identical — just calls `fetch('/api/recent')`. Perfect separation.

- [ ] **Step 3: Commit**

No code changes for this task. Documented architecture decision.

---

### Task 9: Data Migration Script

**Files:**
- Create: `scripts/migrate-to-d1.mjs`

- [ ] **Step 1: Create migration script**

```javascript
// scripts/migrate-to-d1.mjs
// One-time: reads src/content/**/*.html and .order.json, outputs SQL for D1 import
// Usage: node scripts/migrate-to-d1.mjs > migration.sql
// Then: wrangler d1 execute pixel-notes-db --file=migration.sql

import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = resolve(__dirname, '..', 'src', 'content');

async function* walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.name.endsWith('.html') || entry.name === '.order.json') yield full;
  }
}

function extractTitle(content) {
  const m = content.match(/<h1[^>]*>(.+?)<\/h1>/i);
  return m ? m[1].replace(/<[^>]+>/g, '').trim() : 'Untitled';
}

function getParentSlug(slug) {
  const parts = slug.split('/');
  return parts.length > 1 ? parts.slice(0, -1).join('/') : null;
}

async function main() {
  const statements = [];
  const now = Date.now();

  // Read order.json files first to get sort orders
  const orderMap = new Map(); // key: "category/parentSlug" → string[]
  for await (const f of walk(CONTENT_DIR)) {
    if (f.endsWith('.order.json')) {
      const relPath = relative(CONTENT_DIR, f).replace(/\\/g, '/');
      const dirSlug = relPath.replace('/.order.json', '');
      const parts = dirSlug.split('/');
      const orderKey = dirSlug; // e.g., "guitar/Comping"
      const raw = await readFile(f, 'utf-8');
      try { orderMap.set(orderKey, JSON.parse(raw)); } catch {}
    }
  }

  // Process HTML files
  let count = 0;
  for await (const f of walk(CONTENT_DIR)) {
    if (!f.endsWith('.html')) continue;

    const relPath = relative(CONTENT_DIR, f).replace(/\\/g, '/');
    const slug = relPath.replace(/\.html$/, '');
    const parts = slug.split('/');
    const category = parts[0];
    const parentSlug = getParentSlug(slug);

    const content = await readFile(f, 'utf-8');
    const title = extractTitle(content);

    // Get sort order from parent's .order.json
    const leafName = slug.split('/').pop();
    const parentKey = parentSlug ? slug.replace('/' + leafName, '') : category;
    const order = orderMap.get(parentKey) || [];
    const sortOrder = order.indexOf(leafName);

    statements.push(
      `INSERT OR REPLACE INTO notes (slug, category, title, content, parent_slug, sort_order, updated_at) VALUES (` +
      `'${slug.replace(/'/g, "''")}', ` +
      `'${category}', ` +
      `'${title.replace(/'/g, "''")}', ` +
      `'${content.replace(/'/g, "''").replace(/\n/g, '\\n')}', ` +
      `${parentSlug ? `'${parentSlug.replace(/'/g, "''")}'` : 'NULL'}, ` +
      `${sortOrder >= 0 ? sortOrder : 0}, ` +
      `${now + count}` +
      `);`
    );
    count++;
  }

  // Add schema version setting
  statements.push(`INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '1');`);

  // Write output
  const sql = statements.join('\n');
  const outPath = resolve(__dirname, '..', 'migration.sql');
  await writeFile(outPath, sql, 'utf-8');
  console.log(`Generated ${count} INSERT statements → migration.sql`);
  console.log('Next step: wrangler d1 execute pixel-notes-db --file=migration.sql');
}

main().catch(console.error);
```

- [ ] **Step 2: Run migration script locally**

```bash
node scripts/migrate-to-d1.mjs
```

Expected: outputs `Generated 93 INSERT statements → migration.sql`

- [ ] **Step 3: Commit**

```bash
git add scripts/ migration.sql
git commit -m "feat: add D1 data migration script and SQL"
```

---

### Task 10: Final Integration & Deploy Config

**Files:**
- Modify: `package.json` (add worker-related scripts)
- Create: `.cloudflare/` (if needed for Pages routing)

- [ ] **Step 1: Update root package.json scripts**

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "oxlint",
    "preview": "vite preview",
    "worker:dev": "cd workers && wrangler dev",
    "worker:deploy": "cd workers && wrangler deploy",
    "db:init": "cd workers && wrangler d1 execute pixel-notes-db --file=../migration.sql",
    "deploy": "npm run build && npm run worker:deploy"
  }
}
```

- [ ] **Step 2: Ensure _redirects handles API passthrough**

The `public/_redirects` currently has `/* /index.html 200` which would capture `/api/*` too! We need to exclude `/api/*` from the SPA redirect. Cloudflare Pages processes `_redirects` before serving static files, but since we'll use a Worker route binding instead, let's adjust.

Actually, Cloudflare Pages with a Worker binding uses a different approach. We need to either:
- Use **Pages Functions** (`functions/api/[[route]].ts`) — simpler, /api routes are handled by functions
- Use **Worker Routes** in Cloudflare dashboard — bind a Worker to `/api/*` path

For simplicity, let's switch to **Pages Functions** approach. The Worker code is the same; it just lives in `functions/` instead of `workers/`.

Actually, let me reconsider. The cleanest approach for Cloudflare:

**Option A: Separate Worker** — deploy a Worker and bind it to `fuzzyeeestudio.cn/api/*` via Cloudflare Dashboard routes.
- Pro: Clean separation, independent scaling
- Con: Two deploy steps, route binding manual

**Option B: Pages Functions** — put the Worker code in `functions/` directory, Pages auto-deploys functions.
- Pro: Single deploy step, /api automatically routed
- Con: Functions are tied to Pages

Let's go with **Option A** (separate Worker) since we already have the `workers/` scaffold. The `_redirects` file should EXCLUDE `/api/*`:

```
/*    /index.html   200
```

Cloudflare Pages `_redirects` SPA rule doesn't apply to actual files on disk or Worker routes. But since there's no `/api/` directory in dist, the SPA redirect WOULD trigger for `/api/*` paths, which is wrong.

Actually wait — in Cloudflare Pages, if you have a Worker route bound to the same domain for `/api/*`, it takes precedence over Pages routing. So the SPA redirect won't interfere. The Worker route is set up in Cloudflare Dashboard: Workers & Pages → pixel-notes-api → Triggers → Routes → `fuzzyeeestudio.cn/api/*`.

Let me update the plan accordingly.

- [ ] **Step 3: Add Worker route binding instructions to README**

No code change — this is a deployment step documented in Task 11.

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "chore: add worker deploy scripts"
```

---

### Task 11: Deployment Guide

**No code changes — document the deploy process.**

- [ ] **Step 1: Create D1 database**

```bash
cd workers
npx wrangler d1 create pixel-notes-db
```

Copy the output `database_id` into `workers/wrangler.toml`.

- [ ] **Step 2: Run migration**

```bash
cd workers
npx wrangler d1 execute pixel-notes-db --remote --file=../migration.sql
```

Verify: `npx wrangler d1 execute pixel-notes-db --remote --command="SELECT count(*) FROM notes"`

Expected: `93`

- [ ] **Step 3: Deploy Worker**

```bash
cd workers
npx wrangler deploy
```

- [ ] **Step 4: Bind Worker route**

In Cloudflare Dashboard → Workers & Pages → pixel-notes-api → Settings → Triggers → Routes:
Add route: `fuzzyeeestudio.cn/api/*`

- [ ] **Step 5: Deploy Pages**

```bash
npm run build
npx wrangler pages deploy dist --project-name=fuzzyeee-studio
```

Or via Git integration (auto-deploy on push).

- [ ] **Step 6: First login**

Visit `fuzzyeeestudio.cn`, click "login", enter any password. **First login sets the password.** The password hash is stored in D1. Subsequent logins must use the same password.

---

## Summary

| Task | Files | Purpose |
|------|-------|---------|
| 1 | `workers/` scaffold | Worker project setup |
| 2 | `workers/src/schema.ts` | D1 table definitions |
| 3 | `workers/src/index.ts`, `auth.ts` | Login/logout endpoints |
| 4 | `workers/src/index.ts` | Full CRUD + recent + music API |
| 5 | `src/hooks/usePages.ts`, `NotePage.tsx` | Replace import.meta.glob with fetch |
| 6 | `src/components/Sidebar/Sidebar.tsx` | Update type import |
| 7 | `src/data/categories.ts` | Hardcode image paths |
| 8 | (docs only) | Dev mode API via Vite plugin confirmed |
| 9 | `scripts/migrate-to-d1.mjs` | Generate migration SQL from 93 notes |
| 10 | `package.json` | Worker deploy scripts |
| 11 | (docs only) | Step-by-step deploy guide |
