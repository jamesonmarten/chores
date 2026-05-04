#!/usr/bin/env node
// FILE: scripts/smoke-test.mjs
// Run after deploy to verify all endpoints + page routes are live.
//   node scripts/smoke-test.mjs
//   BASE=https://chores.devcabin.tech node scripts/smoke-test.mjs

const BASE = (process.env.BASE || process.env.FRONTEND || 'https://chores.devcabin.tech').replace(/\/$/, '');
const API  = (process.env.API  || `${BASE}/api`).replace(/\/$/, '');

let pass = 0, fail = 0;
const results = [];

async function check(label, fn) {
  process.stdout.write(`  … ${label}`);
  try {
    await fn();
    process.stdout.write(`\r  ✅ ${label}\n`);
    pass++; results.push({ label, ok: true });
  } catch (err) {
    process.stdout.write(`\r  ❌ ${label}\n     → ${err.message}\n`);
    fail++; results.push({ label, ok: false, error: err.message });
  }
}

async function expect(url, opts = {}) {
  const want = opts.status ?? 200;
  // Force HTTP/1.1 + identity encoding to dodge a Node 20/undici bug that
  // sometimes throws "fetch failed" on macOS when talking to Vercel over h2.
  const headers = {
    'Accept-Encoding': 'identity',
    'Connection':      'close',
    ...(opts.headers || {}),
  };
  let r;
  try {
    r = await fetch(url, { method: opts.method || 'GET', headers, body: opts.body });
  } catch (err) {
    // Fallback: shell out to curl. Slower but bullet-proof.
    const { execFileSync } = await import('node:child_process');
    const args = ['-sS', '-o', '/tmp/smoke.body', '-w', '%{http_code}', '-m', '15', url];
    if (opts.method) args.unshift('-X', opts.method);
    if (opts.headers) for (const [k, v] of Object.entries(opts.headers)) args.unshift('-H', `${k}: ${v}`);
    if (opts.body)    args.unshift('--data-binary', opts.body);
    const code = Number(execFileSync('curl', args, { encoding: 'utf8' }).trim());
    if (code !== want) throw new Error(`${url} → ${code} (expected ${want}) [via curl]`);
    const fs = await import('node:fs');
    const text = fs.readFileSync('/tmp/smoke.body', 'utf8');
    if (opts.contains) for (const s of [].concat(opts.contains))
      if (!text.includes(s)) throw new Error(`response missing "${s}"`);
    if (opts.json) return JSON.parse(text);
    return text;
  }
  if (r.status !== want) throw new Error(`${url} → ${r.status} (expected ${want})`);
  if (opts.contains) {
    const text = await r.text();
    for (const s of [].concat(opts.contains)) {
      if (!text.includes(s)) throw new Error(`response missing "${s}"`);
    }
    return text;
  }
  if (opts.json) return r.json();
  return r;
}

console.log(`\n🔎 Smoke test`);
console.log(`   Site: ${BASE}`);
console.log(`   API:  ${API}\n`);

console.log('Frontend pages:');
await check('/  (landing)',   () => expect(BASE + '/',        { contains: 'Family Chores' }));
await check('/app',           () => expect(BASE + '/app',     { contains: 'parentMode' }));
await check('/demo',          () => expect(BASE + '/demo',    { contains: 'demo' }));
await check('/compare',       () => expect(BASE + '/compare', { contains: 'Skylight' }));

console.log('\nAPI endpoints:');
await check('/health',                 async () => {
  const j = await expect(API + '/health', { json: true });
  if (!j.ok) throw new Error('health responded ok=false');
  if (j.priceId      !== 'set') throw new Error('STRIPE_PRICE_ID not set on server');
  if (j.webhookSecret!== 'set') throw new Error('STRIPE_WEBHOOK_SECRET not set on server');
  if (j.stripeKey    !== 'set') throw new Error('STRIPE_SECRET_KEY not set on server');
});
await check('/referral/SMOKETEST',     () => expect(API + '/referral/SMOKETEST', { json: true }));
await check('POST /signup (test)',     () => expect(API + '/signup', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: `smoke+${Date.now()}@test.invalid`, name: 'Smoke Test' }),
  json: true,
}));
await check('POST /calendar/:id',      () => expect(API + '/calendar/smoketest', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ events: [{ uid: 'smoke-1', date: new Date().toISOString(), title: 'Smoke' }] }),
  json: true,
}));
await check('GET  /calendar/:id.ics',  () => expect(API + '/calendar/smoketest.ics', {
  contains: ['BEGIN:VCALENDAR', 'BEGIN:VEVENT', 'SUMMARY:Smoke', 'END:VCALENDAR'],
}));

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
