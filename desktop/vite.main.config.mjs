import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/main.js',
      formats: ['cjs'],
      fileName: 'main'
    },
    rollupOptions: {
      external: ['electron'],
    },
    outDir: '.vite/build',  // Remove /main from here
  },
});