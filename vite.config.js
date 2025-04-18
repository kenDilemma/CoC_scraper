import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// https://vite.dev/config/
export default defineConfig({
  base: '/CoC_scraper/', // Updated to match exact capitalization of repository name
  plugins: [
    vue(),
  ],
  server: {
    open: '/', // Automatically opens the browser to the correct path
    port: 5173, // Default port for Vite
    proxy: {
      '/api/wilmington': {
        target: 'https://www.wilmingtonchamber.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/wilmington/, ''), // Remove /api/wilmington prefix
      },
      '/api/dayton': {
        target: 'https://daytonareachamberofcommerce.growthzoneapp.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/dayton/, ''), // Remove /api/dayton prefix
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
