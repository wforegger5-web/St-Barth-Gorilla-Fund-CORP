// Run with: node test/run.mjs   (no installs needed)
import worker from '../src/index.js';
import assert from 'node:assert/strict';

const env = (extra = {}) => ({
  PAYPAL_CLIENT_ID: 'cid', PAYPAL_CLIENT_SECRET: 'secret', PAYPAL_WEBHOOK_ID: 'WH-1',
  RESEND_API_KEY: 're_test', FROM_EMAIL: 'info@stbarthgorillaexpeditions.com', ...extra,
});
const hdrs = { 'paypal-auth-algo': 'SHA256withRSA', 'paypal-cert-url': 'https://api.paypal.com/cert', 'paypal-transmission-id': 't1', 'paypal-transmission-sig': 'sig', 'paypal-transmission-time': '2026-10-14T00:00:00Z', 'content-type': 'application/json' };
const capture = (over = {}) => ({ event_type: 'PAYMENT.CAPTURE.COMPLETED', resource: { id: 'CAP1', amount: { value: '14092.00', currency_code: 'USD' }, supplementary_data: { related_ids: { order_id: 'ORD1' } }, ...over } });
const order = (over = {}) => ({ payer: { email_address: 'donor@example.com', name: { given_name: 'Amy' } }, purchase_units: [{ description: "Saint Barth Gorilla Fund Registry — Text Books, Fund the Boys' Dormitory" }], ...over });

function mockFetch({ verify = 'SUCCESS', ord = order(), resendOk = true } = {}) {
  const calls = { resend: [], paypal: [] };
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    if (u.endsWith('/v1/oauth2/token')) return Response.json({ access_token: 'tok' });
    if (u.endsWith('/verify-webhook-signature')) { calls.paypal.push(JSON.parse(init.body)); return Response.json({ verification_status: verify }); }
    if (u.includes('/v2/checkout/orders/')) return Response.json(ord);
    if (u === 'https://api.resend.com/emails') { calls.resend.push(JSON.parse(init.body)); return resendOk ? Response.json({ id: 'e1' }) : new Response('nope', { status: 500 }); }
    throw new Error('unexpected fetch ' + u);
  };
  return calls;
}
const post = (body, headers = hdrs) => new Request('https://w.example/', { method: 'POST', headers, body: JSON.stringify(body) });
let n = 0; const ok = (m) => console.log(`ok ${++n} - ${m}`);

// 1 happy path
let calls = mockFetch();
let res = await worker.fetch(post(capture()), env());
assert.equal(res.status, 200); assert.equal(calls.resend.length, 1);
const mail = calls.resend[0];
assert.deepEqual(mail.to, ['donor@example.com']);
assert.equal(mail.from, 'Saint Barth Gorilla Fund <info@stbarthgorillaexpeditions.com>');
assert.match(mail.text, /Dear Amy,/); assert.match(mail.text, /\$14,092\.00/);
assert.match(mail.text, /Text Books, Fund the Boys' Dormitory/);
assert.equal(calls.paypal[0].webhook_id, 'WH-1');
assert.doesNotMatch(mail.text + mail.html, /tax[- ]deductible|501\(c\)/i);
ok('valid payment sends one thank-you with name, amount, items, no tax claims');

// 2 forged / bad signature
calls = mockFetch({ verify: 'FAILURE' });
res = await worker.fetch(post(capture()), env());
assert.equal(res.status, 400); assert.equal(calls.resend.length, 0);
ok('failed signature check is rejected and sends nothing');

// 3 missing PayPal headers
calls = mockFetch();
res = await worker.fetch(post(capture(), { 'content-type': 'application/json' }), env());
assert.equal(res.status, 400); assert.equal(calls.resend.length, 0);
ok('request without PayPal headers is rejected');

// 4 other event types ignored
calls = mockFetch();
res = await worker.fetch(post({ event_type: 'CHECKOUT.ORDER.APPROVED', resource: {} }), env());
assert.equal(res.status, 200); assert.equal(calls.resend.length, 0);
ok('other event types are ignored');

// 5 HTML in donor-controlled fields is escaped
calls = mockFetch({ ord: order({ payer: { email_address: 'x@example.com', name: { given_name: '<script>alert(1)</script>' } } }) });
res = await worker.fetch(post(capture()), env());
assert.equal(res.status, 200);
assert.doesNotMatch(calls.resend[0].html, /<script>/); assert.match(calls.resend[0].html, /&lt;script&gt;/);
ok('donor-supplied text is HTML-escaped in the email');

// 6 no name -> neutral greeting; no description -> no "You chose" line
calls = mockFetch({ ord: order({ payer: { email_address: 'x@example.com' }, purchase_units: [{}] }) });
res = await worker.fetch(post(capture()), env());
assert.match(calls.resend[0].text, /^Hello,/); assert.doesNotMatch(calls.resend[0].text, /You chose/);
ok('works with no name or description');

// 7 no payer email -> skip quietly (200 so PayPal does not retry forever)
calls = mockFetch({ ord: order({ payer: {} }) });
res = await worker.fetch(post(capture()), env());
assert.equal(res.status, 200); assert.equal(calls.resend.length, 0);
ok('missing payer email is skipped without error');

// 8 email provider failure -> 500 so PayPal retries
calls = mockFetch({ resendOk: false });
res = await worker.fetch(post(capture()), env());
assert.equal(res.status, 500);
ok('email failure returns 500 so PayPal retries');

// 9 duplicate delivery with KV bound
const store = new Map(); const SEEN = { get: async (k) => store.get(k), put: async (k, v) => store.set(k, v) };
calls = mockFetch();
await worker.fetch(post(capture()), env({ SEEN }));
await worker.fetch(post(capture()), env({ SEEN }));
assert.equal(calls.resend.length, 1);
ok('a re-delivered event does not send a second email');

// 10 custom sender name + reply-to
calls = mockFetch();
await worker.fetch(post(capture()), env({ FROM_NAME: 'The Fund', REPLY_TO: 'fund@stbarthgorillafund.org' }));
assert.equal(calls.resend[0].from, 'The Fund <info@stbarthgorillaexpeditions.com>'); assert.equal(calls.resend[0].reply_to, 'fund@stbarthgorillafund.org');
ok('FROM_NAME and REPLY_TO settings are used');

console.log(`\nall ${n} checks passed`);
