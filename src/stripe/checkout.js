// FILE: src/stripe/checkout.js
// Client-side Stripe integration — works in browser AND Capacitor iOS

import { Browser } from '@capacitor/browser';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4242';

/**
 * Returns true when running inside a Capacitor native shell (iOS/Android).
 * @returns {boolean}
 */
function isNative() {
  return !!(window.Capacitor?.isNativePlatform?.());
}

/**
 * Opens Stripe Checkout.
 * - On native (iOS/iPad): uses @capacitor/browser in-app browser
 * - On web: redirects the current tab
 *
 * @param {{ familyId?: string }} [opts]
 * @returns {Promise<void>}
 */
export async function startCheckout({ familyId = 'default' } = {}) {
  const successUrl = isNative()
    ? 'familychores://pro?result=success'
    : `${window.location.origin}/?pro=success`;
  const cancelUrl = isNative()
    ? 'familychores://pro?result=cancel'
    : `${window.location.origin}/?pro=cancel`;

  const res = await fetch(`${API}/create-checkout-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ familyId, successUrl, cancelUrl }),
  });

  if (!res.ok) {
    const { error } = await res.json().catch(() => ({}));
    throw new Error(error || 'Failed to create checkout session');
  }

  const { url } = await res.json();

  if (isNative()) {
    await Browser.open({ url, presentationStyle: 'popover' });
  } else {
    window.location.href = url;
  }
}

/**
 * Reads the ?pro= query param on launch and returns the result.
 * Call this once in main.js after page load.
 * @returns {'success' | 'cancel' | null}
 */
export function getCheckoutResult() {
  const params = new URLSearchParams(window.location.search);
  const result = params.get('pro');
  if (result) {
    // Clean the URL without a full reload
    const clean = window.location.pathname;
    history.replaceState({}, '', clean);
  }
  return result; // 'success' | 'cancel' | null
}
