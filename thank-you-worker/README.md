# Automatic thank-you email

When someone completes a payment on the site, PayPal notifies this small
Cloudflare Worker, which emails the donor a thank-you from the Fund.

```
donor pays  ->  PayPal  ->  webhook  ->  this Worker  ->  Resend  ->  donor's inbox
```

PayPal still sends its own receipt. That can't be turned off. This email is in
addition to it, and it does not call the gift tax-deductible.

## One-time setup (about 30 minutes, no command line)

You need free accounts at **Cloudflare** and **Resend**.

### 1. Create the Worker
1. Cloudflare dashboard -> **Workers & Pages** -> **Create** -> **Create Worker** -> name it `gorilla-fund-thank-you` -> **Deploy**.
2. Click **Edit code**, delete the sample, paste in all of `src/index.js`, click **Deploy**.
3. Copy the Worker's address (looks like `https://gorilla-fund-thank-you.YOURNAME.workers.dev`).

### 2. Set up Resend (the email sender)
1. Resend -> **Domains** -> **Add Domain** -> `stbarthgorillaexpeditions.com`.
2. Resend shows a few DNS records. Add them where that domain's DNS is managed
   (GoDaddy, Google Domains, etc.). Wait for the domain to show **Verified**.
   These records don't affect your normal email.
3. Resend -> **API Keys** -> **Create API Key** (sending access) -> copy it.

### 3. Add PayPal's webhook
1. developer.paypal.com -> **Apps & Credentials** -> **Live** -> open your app.
2. **Webhooks** -> **Add Webhook** -> paste the Worker address -> tick only
   **Payment capture completed** -> **Save**.
3. Copy the new webhook's **Webhook ID**.

### 4. Give the Worker its settings
Cloudflare -> your Worker -> **Settings** -> **Variables and Secrets** -> add:

| Name | Type | Value |
|---|---|---|
| `PAYPAL_CLIENT_ID` | Text | your Live Client ID |
| `PAYPAL_CLIENT_SECRET` | **Secret** | your Live Secret key |
| `PAYPAL_WEBHOOK_ID` | Text | from step 3 |
| `RESEND_API_KEY` | **Secret** | from step 2 |
| `FROM_EMAIL` | Text | `info@stbarthgorillaexpeditions.com` |
| `FROM_NAME` | Text | `Saint Barth Gorilla Fund` |

Optional: `REPLY_TO` (where replies go). Then click **Deploy**.

The Secret key lives only in Cloudflare. **Never put it in this repository or the website.**

### 5. Test it
Make a real $1 donation from a different PayPal account or a card. The thank-you
should arrive within a minute. If not, in Cloudflare open the Worker's **Logs**,
and in PayPal's webhook page check **Recent deliveries** for errors.

## Notes
- Covers the main PayPal / card / Venmo buttons. The separate hosted
  "Donate" button is an older PayPal system and may not trigger this email.
  Test it separately.
- Optional duplicate protection: bind a Workers KV namespace named `SEEN`.
- Run the tests locally: `node test/run.mjs` (no installs needed).
- To switch the sender later (for example to fund@stbarthgorillafund.org), change
  `FROM_EMAIL` and verify that domain in Resend.
