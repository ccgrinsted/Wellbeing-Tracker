import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      fs: 'path',
      path: 'path',
      child_process: 'path',
      crypto: 'path',
    },
  },
  build: {
    rollupOptions: {
      external: [],
    },
  },
  optimizeDeps: {
    include: ['react-is', 'recharts'],
  },
});