import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  root: __dirname,
  base: './',
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
    },
  },
  build: {
    lib: {
      entry: 'index.ts',
      formats: ['cjs'],
      fileName: () => '[name].js',
    },
    outDir: './dist',
    emptyOutDir: true,
  },
})
