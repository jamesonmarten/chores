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
      },
    },
  },
  server: {
    // Proxy API calls to the local Express server during development
    proxy: {
      '/create-checkout-session': 'http://localhost:4242',
      '/webhook':                 'http://localhost:4242',
      '/pro-status':              'http://localhost:4242',
      '/signup':                  'http://localhost:4242',
      '/referral':                'http://localhost:4242',
    },
  },
});
