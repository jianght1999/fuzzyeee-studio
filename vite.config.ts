import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { writeFile, mkdir, unlink, readFile, rm, rename as fsRename, readdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'

const PASSWORD = 'pixel123'

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

function editorPlugin(): any {
  return {
    name: 'editor-api',
    configureServer(server: any) {
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

export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/fuzzyeee-studio/' : '/',
  plugins: [react(), editorPlugin()],
}))
