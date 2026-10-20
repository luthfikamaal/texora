import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  build: {
    // Editor LaTeX (CodeMirror) cukup besar; pisahkan agar tidak memblokir awal.
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes('@codemirror') || id.includes('@uiw')) {
              return 'editor'
            }
            if (id.includes('pdfjs') || id.includes('react-pdf')) {
              return 'pdf'
            }
            if (id.includes('radix-ui') || id.includes('@radix-ui')) {
              return 'ui'
            }
            return 'vendor'
          }
          return undefined
        },
      },
    },
  },
})
