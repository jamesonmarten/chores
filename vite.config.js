import { defineConfig } from 'vite';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  // Served at https://chores.devcabin.tech (Vercel) — base is always '/'
  base: '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main:    resolve(__dirname, 'index.html'),
        landing: resolve(__dirname, 'landing.html'),
        demo:    resolve(__dirname, 'demo.html'),
        compare: resolve(__dirname, 'compare.html'),
        snapshot:resolve(__dirname, 'snapshot.html'),
      },
    },
  },
  server: {
    // Proxy /api/* to `vercel dev` (running on :3000) so client + functions work locally.
    // Run `npm run dev:api` in one terminal and `npm run dev` in another.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
