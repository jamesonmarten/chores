import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  // Capacitor needs the built output at /dist (default), served from root
  base: '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    // Proxy /api calls to the local Express server during development
    proxy: {
      '/create-checkout-session': 'http://localhost:4242',
      '/webhook':                 'http://localhost:4242',
      '/pro-status':              'http://localhost:4242',
    },
  },
});
