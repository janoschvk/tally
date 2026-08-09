import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Vercel serves from the root, so no `base` override needed.
  // If you ever deploy to a subpath (e.g. GitHub Pages), set base: '/repo-name/'.
})
