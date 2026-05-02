import { defineConfig } from 'vite';

// https://vitejs.dev/config/
const isCapacitor = process.env.CAPACITOR_BUILD === '1';

export default defineConfig({
  // Web: served at https://devcabin-ai.tech/chores/
  // Capacitor iOS: needs base '/' (assets are bundled locally)
  base: isCapacitor ? '/' : '/chores/',
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
