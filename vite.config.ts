import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // เพิ่มบรรทัดนี้: ขยาย Limit การแจ้งเตือนเป็น 1000 KB (1 MB)
    chunkSizeWarningLimit: 1000, 
  },
})