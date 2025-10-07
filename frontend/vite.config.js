import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
      },
      manifest: {
        name: 'My Trade Application',
        short_name: 'TRADE',
        description: 'A comprehensive trading platform',
        theme_color: '#3b82f6',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: '/trade-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/trade-512.png',
            sizes: '512x512',
            type: 'image/png',
          }
        ],
      },
      devOptions: {
        enabled: true, // ← Change this to true for development
        type: 'module', 
      }
    })
  ],
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1000,
  },
  server: {
    port: 5173,
  }
})