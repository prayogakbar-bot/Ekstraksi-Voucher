import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/', // IMPORTANT untuk custom domain
  build: {
    outDir: 'dist'
  }
})
