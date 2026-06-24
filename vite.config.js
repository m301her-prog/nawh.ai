import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './' // هذا السطر هو الحل الجوهري للمشكلة في كثير من الحالات
})
