import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
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

// Simple in-memory token store (single user)
const tokens = new Set<string>()

function generateToken(): string {
  return 'pixel_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function editorPlugin(): any {
  return {
    name: 'editor-api',
    configureServer(server: any) {
      // Login
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

      // Logout
      server.middlewares.use('/api/logout', async (req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== 'POST') return
        const body = await parseBody(req)
        tokens.delete(body.token || '')
        sendJSON(res, { success: true })
      })

      // Save markdown file
      server.middlewares.use('/api/save', async (req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== 'POST') return
        const body = await parseBody(req)
        if (!tokens.has(body.token || '')) {
          sendJSON(res, { success: false, error: 'not authenticated' }, 403)
          return
        }
        try {
          const filePath = resolve(process.cwd(), body.path)
          await writeFile(filePath, body.content, 'utf-8')
          sendJSON(res, { success: true })
        } catch (err) {
          sendJSON(res, { success: false, error: String(err) }, 500)
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), editorPlugin()],
})
