import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { writeFile, mkdir, unlink } from 'node:fs/promises'
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

      server.middlewares.use('/api/delete-page', async (req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== 'POST') return
        const body = await parseBody(req)
        if (!checkAuth(tokens, body, res)) return
        try {
          const filePath = resolve(process.cwd(), body.path)
          await unlink(filePath)
          sendJSON(res, { success: true })
        } catch (err) {
          sendJSON(res, { success: false, error: String(err) }, 500)
        }
      })

    },
  }
}

export default defineConfig({
  plugins: [react(), editorPlugin()],
})
