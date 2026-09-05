import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // Defines external modules for the Rolldown bundler engine
    rolldownOptions: {
      external: ['fs', 'path', 'child_process', 'crypto'],
    },
    // Fallback for standard Rollup environments
    rollupOptions: {
      external: ['fs', 'path', 'child_process', 'crypto'],
    },
  },
  optimizeDeps: {
    include: ['html2pdf.js'],
  },
});