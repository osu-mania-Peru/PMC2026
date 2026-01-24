import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Plugin to serve /horse as static (not SPA)
const HORSE_ENABLED = false
const horseStaticPlugin = () => ({
  name: 'horse-static',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url === '/horse' || req.url.startsWith('/horse/')) {
        if (!HORSE_ENABLED) {
          res.writeHead(404)
          res.end('Not found')
          return
        }
        // Redirect /horse to /horse/ so relative paths work correctly
        if (req.url === '/horse') {
          res.writeHead(302, { Location: '/horse/' })
          res.end()
          return
        }
        // Serve /horse/ as /horse/index.html
        if (req.url === '/horse/') {
          req.url = '/horse/index.html'
        }
      }
      next()
    })
  }
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [horseStaticPlugin(), react()],
  optimizeDeps: {
    include: ['@g-loot/react-tournament-brackets']
  }
})
