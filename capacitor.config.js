import { CapacitorConfig } from '@capacitor/cli';

/** @type {CapacitorConfig} */
const config = {
  // Must match the bundle ID you'll use in Xcode
  appId: 'com.devcabin.familychores',
  appName: 'Family Chores',
  // Point Capacitor at the Vite build output
  webDir: 'dist',
  // Allow the in-app browser to return via custom URL scheme
  // (used by Stripe Checkout on iOS — see src/stripe/checkout.js)
  server: {
    // Uncomment during development to live-reload from Vite dev server:
    // url: 'http://YOUR_LAN_IP:5174',
    // cleartext: true,
  },
  plugins: {
    Browser: {
      // Capacitor Browser plugin — no extra config needed
    },
    // Handle the deep-link scheme familychores:// for Stripe return
    App: {
      // Registered in ios/App/App/Info.plist via Capacitor
    },
  },
  ios: {
    // Allows App Tracking Transparency prompt if needed
    allowsLinkPreview: false,
    // Override status bar style to match the dark theme
    backgroundColor: '#020617',
  },
};

export default config;
