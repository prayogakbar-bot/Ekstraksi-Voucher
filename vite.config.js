import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Sesuaikan base dengan nama repository GitHub Pages
export default defineConfig({
  base: '/Ekstraksi-Voucher/',
  plugins: [react()]
})
