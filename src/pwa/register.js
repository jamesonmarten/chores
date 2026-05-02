// FILE: src/pwa/register.js

const INSTALL_DISMISSED_KEY = 'familyChoresInstallDismissed';

/**
 * Injects the PWA web manifest, shows iOS install banner, and registers service worker.
 */
export function registerPwaShell() {
  _injectManifest();
  _handleInstallBanner();
  _registerServiceWorker();
}

function _injectManifest() {
  const manifest = {
    name: 'Family Chores & More',
    short_name: 'Family Chores',
    start_url: '.',
    scope: '.',
    display: 'standalone',
    display_override: ['standalone', 'fullscreen', 'minimal-ui'],
    background_color: '#020617',
    theme_color: '#020617',
    orientation: 'portrait-primary',
    categories: ['family', 'productivity', 'kids'],
    description: 'A family chore and reward tracker for iPhone and iPad.',
    icons: [{
      src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Crect width='512' height='512' rx='112' fill='%23020617'/%3E%3Cpath d='M128 264l78 78 178-203' fill='none' stroke='%2322c55e' stroke-width='52' stroke-linecap='round' stroke-linejoin='round'/%3E%3Ccircle cx='383' cy='375' r='52' fill='%230ea5e9'/%3E%3C/svg%3E",
      sizes: '512x512',
      type: 'image/svg+xml',
      purpose: 'any maskable',
    }],
  };
  const link = document.createElement('link');
  link.rel = 'manifest';
  link.href = 'data:application/manifest+json,' + encodeURIComponent(JSON.stringify(manifest));
  document.head.appendChild(link);
}

function _handleInstallBanner() {
  const installBannerEl  = document.getElementById('installBanner');
  const dismissInstallEl = document.getElementById('dismissInstall');
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const dismissed = localStorage.getItem(INSTALL_DISMISSED_KEY) === '1';

  if (isIOS && !isStandalone && !dismissed && installBannerEl) {
    installBannerEl.hidden = false;
  }

  if (dismissInstallEl) {
    dismissInstallEl.onclick = () => {
      localStorage.setItem(INSTALL_DISMISSED_KEY, '1');
      installBannerEl.hidden = true;
    };
  }
}

function _registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !location.protocol.startsWith('http')) return;

  const sw = `
    const CACHE='family-chores-v1';
    self.addEventListener('install',e=>{
      self.skipWaiting();
      e.waitUntil(caches.open(CACHE).then(c=>c.addAll(['./']).catch(()=>{})));
    });
    self.addEventListener('activate',e=>{
      e.waitUntil(self.clients.claim());
    });
    self.addEventListener('fetch',e=>{
      if(e.request.method!=='GET')return;
      e.respondWith(
        fetch(e.request).then(r=>{
          const copy=r.clone();
          caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{});
          return r;
        }).catch(()=>caches.match(e.request).then(r=>r||caches.match('./')))
      );
    });`;

  const blob = new Blob([sw], { type: 'text/javascript' });
  navigator.serviceWorker.register(URL.createObjectURL(blob)).catch(() => {});
}
