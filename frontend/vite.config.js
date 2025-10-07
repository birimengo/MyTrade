import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1000,
    // Remove the rollupOptions for now to fix the build
  },
  server: {
    port: 5173,
  }
})