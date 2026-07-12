import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { writeFile, mkdir, unlink, readFile, rm, rename as fsRename, readdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'

const PASSWORD = process.env.VITE_EDITOR_PASSWORD || 'pixel-' + Math.random().toString(36).slice(2, 8)

function parseBody(req: IncomingMessage): Promise<Record<string, string>> {
  return new Promise((resolve) => {
    let body = ''
    req.on('data', (chunk: Buffer) => { body += chunk.toString() })
    req.on('end', () => {
      try { resolve(JSON.parse(body)) }
      catch { resolve({}) }
    })
  })
}

function sendJSON(res: ServerResponse, data: object, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

function checkAuth(tokens: Set<string>, body: Record<string, string>, res: ServerResponse): boolean {
  if (!tokens.has(body.token || '')) {
    sendJSON(res, { success: false, error: 'not authenticated' }, 403)
    return false
  }
  return true
}

const tokens = new Set<string>()

function generateToken(): string {
  return 'pixel_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

const RECENT_PATH = resolve(process.cwd(), '.recent.json')

async function updateRecent(filePath: string) {
  try {
    const raw = await readFile(RECENT_PATH, 'utf-8').catch(() => '[]')
    const list = JSON.parse(raw)
    // Extract title from filename, category from path
    const parts = filePath.replace(/\\/g, '/').split('/')
    const filename = parts[parts.length - 1].replace(/\.html$/, '')
    const catIdx = parts.indexOf('src') + 2 // src/content/{category}/...
    const category = catIdx < parts.length ? parts[catIdx] : ''
    // Remove existing entry for same path, prepend new
    const filtered = list.filter((e: any) => e.path !== filePath)
    filtered.unshift({ path: filePath, title: filename, category, time: new Date().toISOString() })
    // Keep only last 50
    await writeFile(RECENT_PATH, JSON.stringify(filtered.slice(0, 50), null, 2), 'utf-8')
  } catch { /* ignore */ }
}

function extractTitle(content: string): string {
  const m = content.match(/<h1[^>]*>(.+?)<\/h1>/i)
  return m ? m[1].replace(/<[^>]+>/g, '').trim() : 'Untitled'
}

async function walkDir(dir: string): Promise<string[]> {
  const results: string[] = []
  async function walk(d: string) {
    try {
      const entries = await readdir(d, { withFileTypes: true })
      for (const e of entries) {
        const full = resolve(d, e.name)
        if (e.isDirectory()) await walk(full)
        else results.push(full)
      }
    } catch {}
  }
  await walk(dir)
  return results
}

function editorPlugin(): any {
  return {
    name: 'editor-api',
    configureServer(server: any) {
      console.log('\n🔑 编辑器密码: ' + PASSWORD + '\n')
      server.middlewares.use('/api/login', async (req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== 'POST') return
        const body = await parseBody(req)
        if (body.password === PASSWORD) {
          const token = generateToken()
          tokens.add(token)
          sendJSON(res, { success: true, token })
        } else {
          sendJSON(res, { success: false, error: 'wrong password' }, 401)
        }
      })

      server.middlewares.use('/api/logout', async (req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== 'POST') return
        const body = await parseBody(req)
        tokens.delete(body.token || '')
        sendJSON(res, { success: true })
      })

      server.middlewares.use('/api/save', async (req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== 'POST') return
        const body = await parseBody(req)
        if (!checkAuth(tokens, body, res)) return
        try {
          const filePath = resolve(process.cwd(), body.path)
          await mkdir(dirname(filePath), { recursive: true })
          await writeFile(filePath, body.content, 'utf-8')
          if (body.path.endsWith('.html')) updateRecent(body.path) // only track page edits
          sendJSON(res, { success: true })
        } catch (err) {
          sendJSON(res, { success: false, error: String(err) }, 500)
        }
      })

      server.middlewares.use('/api/create-page', async (req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== 'POST') return
        const body = await parseBody(req)
        if (!checkAuth(tokens, body, res)) return
        try {
          const filePath = resolve(process.cwd(), body.path)
          await mkdir(dirname(filePath), { recursive: true })
          await writeFile(filePath, body.content || '# New Page\n\n', 'utf-8')
          sendJSON(res, { success: true })
        } catch (err) {
          sendJSON(res, { success: false, error: String(err) }, 500)
        }
      })

      server.middlewares.use('/api/recent-delete', async (req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== 'POST') return
        const body = await parseBody(req)
        if (!checkAuth(tokens, body, res)) return
        try {
          const raw = await readFile(RECENT_PATH, 'utf-8').catch(() => '[]')
          const list = JSON.parse(raw)
          const filtered = list.filter((e: any) => e.path !== body.path)
          await writeFile(RECENT_PATH, JSON.stringify(filtered, null, 2), 'utf-8')
          sendJSON(res, { success: true })
        } catch (err) {
          sendJSON(res, { success: false, error: String(err) }, 500)
        }
      })

      server.middlewares.use('/api/move-page', async (req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== 'POST') return
        const body = await parseBody(req)
        if (!checkAuth(tokens, body, res)) return
        try {
          const oldPath = resolve(process.cwd(), body.oldPath)
          const newPath = resolve(process.cwd(), body.newPath)
          // Move .html file
          await mkdir(dirname(newPath), { recursive: true })
          await fsRename(oldPath, newPath)
          // Move subdirectory if exists
          const oldSub = oldPath.replace(/\.html$/, '')
          const newSub = newPath.replace(/\.html$/, '')
          await fsRename(oldSub, newSub).catch(() => {})
          // Update old parent's .order.json
          const oldSlug = body.oldPath.replace(/\\/g, '/').split('/').pop()?.replace(/\.html$/, '')
          const newSlug = body.newPath.replace(/\\/g, '/').split('/').pop()?.replace(/\.html$/, '')
          // Remove from old parent
          const oldParentDir = dirname(oldPath)
          const oldOrderPath = resolve(oldParentDir, '.order.json')
          try {
            const raw = await readFile(oldOrderPath, 'utf-8')
            const order = JSON.parse(raw)
            if (Array.isArray(order) && oldSlug) {
              await writeFile(oldOrderPath, JSON.stringify(order.filter((s: string) => s !== oldSlug), null, 2), 'utf-8')
            }
          } catch {}
          // Add to new parent
          const newParentDir = dirname(newPath)
          const newOrderPath = resolve(newParentDir, '.order.json')
          try {
            const raw = await readFile(newOrderPath, 'utf-8').catch(() => '[]')
            const order = JSON.parse(raw)
            if (Array.isArray(order) && newSlug && !order.includes(newSlug)) {
              order.push(newSlug)
              await writeFile(newOrderPath, JSON.stringify(order, null, 2), 'utf-8')
            } else if (!Array.isArray(order) && newSlug) {
              await writeFile(newOrderPath, JSON.stringify([newSlug], null, 2), 'utf-8')
            }
          } catch {}
          sendJSON(res, { success: true })
        } catch (err) {
          sendJSON(res, { success: false, error: String(err) }, 500)
        }
      })

      // ---- GET /api/pages/:category 和 /api/pages/:category/:slug ----
      // 用通用中间件自行解析路径，避免 Connect 路径剥离的不确定性
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const url = req.url || ''
        if (!url.startsWith('/api/pages/') && url !== '/api/pages') {
          return next()
        }
        if (req.method !== 'GET') return

        const path = decodeURIComponent(url.replace('/api/pages', '').replace(/^\//, ''))
        const parts = path.split('/').filter(Boolean)
        if (parts.length === 0) return

        const category = parts[0]
        const contentDir = resolve(process.cwd(), 'src', 'content', category)

        if (parts.length === 1) {
          // GET /api/pages/:category → 页面列表
          try {
            const allFiles = await walkDir(contentDir)
            const pageList: any[] = []
            const slugsWithChildren = new Set<string>()

            // 预加载所有 .order.json 进缓存
            const orderCache = new Map<string, string[]>()
            for (const f of allFiles) {
              if (!f.endsWith('.order.json')) continue
              const fNorm = f.replace(/\\/g, '/')
              const dirNorm = contentDir.replace(/\\/g, '/')
              const key = fNorm.replace(dirNorm, '').replace(/^\//, '').replace('/.order.json', '') || '__root__'
              try {
                const raw = await readFile(f, 'utf-8')
                const order = JSON.parse(raw)
                if (Array.isArray(order)) orderCache.set(key, order)
              } catch {}
            }

            for (const f of allFiles) {
              if (!f.endsWith('.html')) continue
              const fNorm = f.replace(/\\/g, '/')
              const dirNorm = contentDir.replace(/\\/g, '/')
              const relPath = fNorm.replace(dirNorm, '')
              const slug = relPath.replace(/^\//, '').replace(/\.html$/, '')
              const slugParts = slug.split('/')
              const pSlug = slugParts.length > 1 ? slugParts.slice(0, -1).join('/') : null
              if (pSlug) slugsWithChildren.add(pSlug)

              const raw = await readFile(f, 'utf-8')
              const title = extractTitle(raw)
              pageList.push({ slug, title, parentSlug: pSlug, hasChildren: false })
            }

            for (const p of pageList) {
              if (slugsWithChildren.has(p.slug)) p.hasChildren = true
            }

            // 复用原始 useMarkdownPages 的排序逻辑
            const rootOrder = orderCache.get('__root__') || []
            pageList.sort((a: any, b: any) => {
              if (!a.parentSlug && b.parentSlug) return -1
              if (a.parentSlug && !b.parentSlug) return 1

              const leafA = a.slug.split('/').pop() || ''
              const leafB = b.slug.split('/').pop() || ''

              if (a.parentSlug && b.parentSlug) {
                if (a.parentSlug !== b.parentSlug) return a.parentSlug.localeCompare(b.parentSlug)
                const o = orderCache.get(a.parentSlug) || []
                const ai = o.indexOf(leafA), bi = o.indexOf(leafB)
                if (ai !== -1 && bi !== -1) return ai - bi
                if (ai !== -1) return -1
                if (bi !== -1) return 1
              }

              const ai = rootOrder.indexOf(leafA), bi = rootOrder.indexOf(leafB)
              if (ai !== -1 && bi !== -1) return ai - bi
              if (ai !== -1) return -1
              if (bi !== -1) return 1
              if (leafA === 'overview') return -1
              if (leafB === 'overview') return 1
              return a.slug.localeCompare(b.slug)
            })

            sendJSON(res, { pages: pageList })
          } catch (err) { sendJSON(res, { pages: [] }) }
        } else {
          // GET /api/pages/:category/:slug → 单篇内容
          try {
            const slug = parts.slice(1).join('/')
            const filePath = resolve(contentDir, slug + '.html')
            const raw = await readFile(filePath, 'utf-8')
            const title = extractTitle(raw)
            const slugParts2 = slug.split('/')
            const pSlug2 = slugParts2.length > 1 ? slugParts2.slice(0, -1).join('/') : null
            sendJSON(res, { slug, title, content: raw, parentSlug: pSlug2, updatedAt: Date.now() })
          } catch {
            sendJSON(res, { error: 'not found' }, 404)
          }
        }
      })

      server.middlewares.use('/api/music-list', async (_req: IncomingMessage, res: ServerResponse) => {
        try {
          const musicDir = resolve(process.cwd(), 'public/music')
          const files = await readdir(musicDir).catch(() => [] as string[])
          const mp3s = files.filter(f => f.endsWith('.mp3')).map(f => `/music/${f}`)
          sendJSON(res, mp3s)
        } catch { sendJSON(res, []) }
      })

      server.middlewares.use('/api/recent', async (req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== 'GET') return
        try {
          const raw = await readFile(RECENT_PATH, 'utf-8').catch(() => '[]')
          sendJSON(res, JSON.parse(raw))
        } catch { sendJSON(res, []) }
      })

      server.middlewares.use('/api/delete-page', async (req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== 'POST') return
        const body = await parseBody(req)
        if (!checkAuth(tokens, body, res)) return
        try {
          const filePath = resolve(process.cwd(), body.path)
          await unlink(filePath)
          // Also remove subdirectory if exists (same name minus extension)
          const subDir = filePath.replace(/\.html$/, '')
          await rm(subDir, { recursive: true, force: true }).catch(() => {})
          // Remove from parent .order.json
          const parentDir = dirname(filePath)
          const orderPath = resolve(parentDir, '.order.json')
          const slug = filePath.replace(/\\/g, '/').split('/').pop()?.replace(/\.html$/, '')
          try {
            const raw = await readFile(orderPath, 'utf-8')
            const order = JSON.parse(raw)
            if (Array.isArray(order) && slug) {
              const filtered = order.filter((s: string) => s !== slug)
              await writeFile(orderPath, JSON.stringify(filtered, null, 2), 'utf-8')
            }
          } catch { /* no order.json to update */ }
          sendJSON(res, { success: true })
        } catch (err) {
          sendJSON(res, { success: false, error: String(err) }, 500)
        }
      })

      server.middlewares.use('/api/rename-page', async (req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== 'POST') return
        const body = await parseBody(req)
        if (!checkAuth(tokens, body, res)) return
        try {
          const oldPath = resolve(process.cwd(), body.oldPath)
          const newPath = resolve(process.cwd(), body.newPath)
          // Rename the .html file
          await mkdir(dirname(newPath), { recursive: true })
          await fsRename(oldPath, newPath)
          // Also rename subdirectory if exists
          const oldSub = oldPath.replace(/\.html$/, '')
          const newSub = newPath.replace(/\.html$/, '')
          await fsRename(oldSub, newSub).catch(() => {})
          // Update .order.json in parent directory
          const oldSlug = body.oldPath.replace(/\\/g, '/').split('/').pop()?.replace(/\.html$/, '')
          const newSlug = body.newPath.replace(/\\/g, '/').split('/').pop()?.replace(/\.html$/, '')
          const orderPath = resolve(dirname(oldPath), '.order.json')
          try {
            const raw = await readFile(orderPath, 'utf-8')
            const order = JSON.parse(raw)
            if (Array.isArray(order) && oldSlug && newSlug) {
              const updated = order.map((s: string) => s === oldSlug ? newSlug : s)
              await writeFile(orderPath, JSON.stringify(updated, null, 2), 'utf-8')
            }
          } catch { /* no order.json */ }
          sendJSON(res, { success: true })
        } catch (err) {
          sendJSON(res, { success: false, error: String(err) }, 500)
        }
      })

    },
  }
}

export default defineConfig(() => ({
  base: '/',
  plugins: [react(), editorPlugin()],
}))
