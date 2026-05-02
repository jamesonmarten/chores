import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  // Served at https://products.devcabin.tech (Vercel) — base is always '/'
  // Capacitor iOS also uses '/' — no special flag needed
  base: '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    // Proxy API calls to the local Express server during development
    proxy: {
      '/create-checkout-session': 'http://localhost:4242',
      '/webhook':                 'http://localhost:4242',
      '/pro-status':              'http://localhost:4242',
    },
  },
});
