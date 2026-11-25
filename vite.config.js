import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Production builds are served from GitHub Pages at /KCC-Holding-Tax-Management/.
// Override with BASE_PATH=/ when hosting at a domain root.
export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? (process.env.BASE_PATH ?? '/KCC-Holding-Tax-Management/') : '/',
  plugins: [react()],
  server: { port: 5175, open: false },
}))
