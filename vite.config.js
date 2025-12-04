import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '', // kosong karena pakai custom domain
  build: {
    outDir: 'dist'
  }
})
