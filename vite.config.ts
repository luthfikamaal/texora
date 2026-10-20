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
        // Server statis yang dipakai deployment tidak selalu memetakan .mjs ke
        // JavaScript, sehingga worker pdf.js gagal dimuat sebagai module.
        // Kirim sebagai .js agar MIME-nya benar.
        assetFileNames: (assetInfo) => {
          const name = assetInfo.names?.[0] ?? ''
          if (name.endsWith('.mjs')) {
            return 'assets/[name]-[hash].js'
          }
          return 'assets/[name]-[hash][extname]'
        },
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
