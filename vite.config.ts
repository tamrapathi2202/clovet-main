import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  base: process.env.VITE_BASE_PATH === '/' ? '/' : '/clovet/',
  server: {
    proxy: {
      // Proxy API requests during development to the backend. You can
      // override the target with the `API_PROXY_TARGET` env var, e.g.
      // `API_PROXY_TARGET=http://localhost:6000 npm run dev`.
      '/api': {
        target: process.env.API_PROXY_TARGET || 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '/api'),
      },
    },
  },

});
