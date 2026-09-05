import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      external: ['fs', 'path', 'child_process'],
    },
  },
  optimizeDeps: {
    include: ['html2pdf.js'],
  },
});