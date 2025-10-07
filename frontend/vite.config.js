
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  base: './', // Change this to relative path
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsDir: 'assets', // Organize assets in a subdirectory
  },
  publicDir: 'public', // Ensure public directory for static assets
})