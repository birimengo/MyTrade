import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  base: '/', // CHANGE THIS LINE - remove process.env.VITE_BASE_PATH
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
})