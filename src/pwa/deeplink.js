// FILE: src/pwa/deeplink.js
// Handles capacitor App URL-open events (deep links) for iOS.
// The Stripe checkout redirects to familychores://pro?result=success|cancel

import { App } from '@capacitor/app';

/**
 * Register a deep-link listener. Call once from main.js on native.
 * @param {(result: 'success'|'cancel') => void} callback
 */
export function registerDeepLinkHandler(callback) {
  // Only available in Capacitor native shell
  if (!window.Capacitor?.isNativePlatform?.()) return;

  App.addListener('appUrlOpen', ({ url }) => {
    try {
      // e.g. familychores://pro?result=success
      const parsed = new URL(url);
      const result = parsed.searchParams.get('result');
      if ((parsed.host === 'pro' || parsed.pathname.includes('pro')) && result) {
        callback(result);
      }
    } catch {
      // Ignore unparseable URLs
    }
  });
}
