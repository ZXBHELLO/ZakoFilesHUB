import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'hf-cdn-proxy',
      configureServer(server) {
        server.middlewares.use('/hf-cdn', async (req, res) => {
          const url = new URL(req.url || '', 'http://localhost')
          const target = url.searchParams.get('url')
          if (!target) {
            res.statusCode = 400
            res.end('Missing url')
            return
          }

          if (req.method === 'OPTIONS') {
            res.writeHead(204, {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
              'Access-Control-Allow-Headers': '*',
              'Access-Control-Max-Age': '86400',
            })
            res.end()
            return
          }

          try {
            const chunks: Buffer[] = []
            for await (const chunk of req) {
              chunks.push(chunk as Buffer)
            }
            const body = Buffer.concat(chunks)

            const allowed = ['content-type', 'authorization', 'accept', 'range', 'accept-encoding']
            const headers: Record<string, string> = {}
            for (const [key, val] of Object.entries(req.headers)) {
              if (allowed.includes(key.toLowerCase())) {
                headers[key] = Array.isArray(val) ? val[0] : val || ''
              }
            }

            const response = await fetch(target, {
              method: req.method || 'GET',
              headers,
              body: body.length > 0 ? body : undefined,
            })

            res.statusCode = response.status
            response.headers.forEach((value, key) => {
              if (!['transfer-encoding', 'content-encoding', 'content-length'].includes(key.toLowerCase())) {
                res.setHeader(key, value)
              }
            })
            res.setHeader('Access-Control-Allow-Origin', '*')

            const buffer = Buffer.from(await response.arrayBuffer())
            res.end(buffer)
          } catch {
            res.statusCode = 502
            res.end('CDN proxy error')
          }
        })
      },
    },
  ],
  base: './',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 4096,
  },
  server: {
    proxy: {
      '/hf-proxy': {
        target: 'https://hf-mirror.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/hf-proxy/, ''),
      },
    },
  },
})
