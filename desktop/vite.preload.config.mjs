import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/preload.js',
      formats: ['cjs'],
      fileName: 'preload'
    },
    rollupOptions: {
      external: ['electron'],
    },
    outDir: '.vite/build',  // Remove /main from here
  },
});