/**
 * Saint Barth Gorilla Fund — automatic thank-you email
 *
 * A Cloudflare Worker. PayPal calls it (a "webhook") every time a payment is
 * completed. It checks the call really came from PayPal, looks up who paid,
 * and sends them a thank-you email from the Fund through Resend.
 *
 * Single file, no imports, so it can be pasted straight into the Cloudflare
 * dashboard editor. See ../README.md for setup.
 *
 * Settings (Cloudflare → your worker → Settings → Variables and Secrets):
 *   PAYPAL_CLIENT_ID      Live Client ID            (text)
 *   PAYPAL_CLIENT_SECRET  Live Secret key           (SECRET, never in this file)
 *   PAYPAL_WEBHOOK_ID     ID PayPal gives the webhook (text)
 *   RESEND_API_KEY        Resend API key            (SECRET)
 *   FROM_EMAIL            e.g. info@stbarthgorillaexpeditions.com
 *   FROM_NAME             optional, default "Saint Barth Gorilla Fund"
 *   REPLY_TO              optional, where donor replies go (default FROM_EMAIL)
 *   PAYPAL_API_BASE       optional, default https://api-m.paypal.com (live)
 *
 * Optional: bind a Workers KV namespace named SEEN to avoid sending twice
 * if PayPal re-delivers the same event.
 */

const DEFAULT_API = 'https://api-m.paypal.com';

export default {
  async fetch(request, env) {
    if (request.method === 'GET') return new Response('Thank-you worker is running.');
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

    const raw = await request.text();
    let event;
    try {
      event = JSON.parse(raw);
    } catch {
      return new Response('Bad request', { status: 400 });
    }

    // 1) Make sure this really came from PayPal.
    let verified = false;
    try {
      verified = await verifyWithPayPal(request, event, env);
    } catch (err) {
      console.error('Signature check failed to run:', err.message);
      return new Response('Could not verify', { status: 500 }); // PayPal will retry
    }
    if (!verified) return new Response('Invalid signature', { status: 400 });

    // 2) Only completed payments get a thank-you.
    if (event.event_type !== 'PAYMENT.CAPTURE.COMPLETED') {
      return new Response('Ignored');
    }

    const capture = event.resource || {};
    const captureId = capture.id;
    if (env.SEEN && captureId && (await env.SEEN.get(captureId))) {
      return new Response('Already sent');
    }

    const orderId = capture.supplementary_data?.related_ids?.order_id;
    if (!orderId) {
      console.log('No order id on capture', captureId, '— skipping');
      return new Response('No order id');
    }

    // 3) Look up who paid and what they chose.
    let order;
    try {
      order = await getOrder(orderId, env);
    } catch (err) {
      console.error('Order lookup failed:', err.message);
      return new Response('Order lookup failed', { status: 500 }); // retry
    }

    const email = order.payer?.email_address;
    if (!email) {
      console.log('No payer email for order', orderId, '— skipping');
      return new Response('No payer email');
    }

    const donor = {
      email,
      firstName: order.payer?.name?.given_name || '',
      amount: capture.amount?.value,
      currency: capture.amount?.currency_code || 'USD',
      description: order.purchase_units?.[0]?.description || '',
    };

    // 4) Send the thank-you.
    try {
      await sendThankYou(donor, env);
    } catch (err) {
      console.error('Email send failed:', err.message);
      return new Response('Email failed', { status: 500 }); // retry
    }

    if (env.SEEN && captureId) await env.SEEN.put(captureId, '1', { expirationTtl: 60 * 60 * 24 * 30 });
    return new Response('Thank-you sent');
  },
};

/* ---------------------------- PayPal helpers ---------------------------- */

function apiBase(env) {
  return (env.PAYPAL_API_BASE || DEFAULT_API).replace(/\/$/, '');
}

async function getAccessToken(env) {
  const res = await fetch(`${apiBase(env)}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`PayPal token request returned ${res.status}`);
  return (await res.json()).access_token;
}

async function verifyWithPayPal(request, event, env) {
  const h = request.headers;
  const body = {
    auth_algo: h.get('paypal-auth-algo'),
    cert_url: h.get('paypal-cert-url'),
    transmission_id: h.get('paypal-transmission-id'),
    transmission_sig: h.get('paypal-transmission-sig'),
    transmission_time: h.get('paypal-transmission-time'),
    webhook_id: env.PAYPAL_WEBHOOK_ID,
    webhook_event: event,
  };
  // A call missing PayPal's headers is not from PayPal.
  if (!body.transmission_id || !body.transmission_sig || !body.cert_url) return false;

  const token = await getAccessToken(env);
  const res = await fetch(`${apiBase(env)}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PayPal verify returned ${res.status}`);
  return (await res.json()).verification_status === 'SUCCESS';
}

async function getOrder(orderId, env) {
  const token = await getAccessToken(env);
  const res = await fetch(`${apiBase(env)}/v2/checkout/orders/${encodeURIComponent(orderId)}`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`PayPal order lookup returned ${res.status}`);
  return res.json();
}

/* ------------------------------- Email ---------------------------------- */

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function money(amount, currency) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n);
  } catch {
    return `${n.toFixed(2)} ${currency}`;
  }
}

function buildEmail(donor) {
  const greeting = donor.firstName ? `Dear ${donor.firstName},` : 'Hello,';
  const amount = money(donor.amount, donor.currency);
  const gift = amount ? `your gift of ${amount}` : 'your gift';

  // The order description is built by the website, e.g.
  // "Saint Barth Gorilla Fund Registry — Text Books, Fund the Boys' Dormitory".
  const chose = donor.description ? `You chose to support: ${donor.description}.` : '';

  const text = [
    greeting,
    '',
    `Thank you for ${gift} to the Saint Barth Gorilla Fund. It will go to the schools and conservation partners we work with in Uganda, Tanzania, and Rwanda, and it is felt on the ground.`,
    chose,
    '',
    'PayPal has also emailed you a payment receipt. That receipt is your record of this transaction.',
    '',
    'If you have any questions, just reply to this email.',
    '',
    'With gratitude,',
    'The Saint Barth Gorilla Fund',
    'A nonprofit branch of the Saint Barth Gorilla Alliance',
    'https://stbarthgorillafund.org',
  ]
    .filter((line, i, arr) => !(line === '' && arr[i - 1] === ''))
    .join('\n');

  const html = `<!doctype html><html><body style="margin:0;background:#f4efe2;">
<div style="max-width:560px;margin:0 auto;padding:36px 28px;font-family:Georgia,'Times New Roman',serif;color:#1b1a16;line-height:1.6;font-size:16px;">
  <p style="letter-spacing:.2em;text-transform:uppercase;font-size:12px;color:#8a6a2c;margin:0 0 22px;">Saint Barth Gorilla Fund</p>
  <p>${esc(greeting)}</p>
  <p>Thank you for ${esc(gift)} to the Saint Barth Gorilla Fund. It will go to the schools and conservation partners we work with in Uganda, Tanzania, and Rwanda, and it is felt on the ground.</p>
  ${chose ? `<p>${esc(chose)}</p>` : ''}
  <p>PayPal has also emailed you a payment receipt. That receipt is your record of this transaction.</p>
  <p>If you have any questions, just reply to this email.</p>
  <p style="margin-top:28px;">With gratitude,<br>The Saint Barth Gorilla Fund</p>
  <p style="font-size:13px;color:#6b665a;margin-top:28px;border-top:1px solid #d9d0b8;padding-top:14px;">
    A nonprofit branch of the Saint Barth Gorilla Alliance<br>
    <a href="https://stbarthgorillafund.org" style="color:#8a6a2c;">stbarthgorillafund.org</a>
  </p>
</div></body></html>`;

  return { subject: 'Thank you for your gift to the Saint Barth Gorilla Fund', text, html };
}

async function sendThankYou(donor, env) {
  const { subject, text, html } = buildEmail(donor);
  const fromName = env.FROM_NAME || 'Saint Barth Gorilla Fund';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: `${fromName} <${env.FROM_EMAIL}>`,
      to: [donor.email],
      reply_to: env.REPLY_TO || env.FROM_EMAIL,
      subject,
      text,
      html,
    }),
  });
  if (!res.ok) throw new Error(`Resend returned ${res.status}: ${await res.text()}`);
}

