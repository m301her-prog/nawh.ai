import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './' // هذا هو السطر المهم جداً لحل الصفحة البيضاء
})
