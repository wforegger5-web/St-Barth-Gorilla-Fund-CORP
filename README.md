[README.md](https://github.com/user-attachments/files/31153251/README.md)

# Saint Barth Gorilla Fund — Website

A static site (`index.html` + an `assets/logos/` folder) styled to match the
parent brand, [stbarthgorillaexpeditions.com](https://www.stbarthgorillaexpeditions.com/):
dark, ivory/gold, serif + sans pairing, minimal luxury layout, using your
actual gorilla logo throughout.

## What's inside
- Hero, mission, "how it works" pillars
- **"Where We Give"** — a 3-column Uganda / Tanzania / Rwanda overview styled
  after the main site's "The Journeys" section, linking down into...
- A full partner directory grouped **Uganda → Tanzania → Rwanda**
- "The Registry" — a real checklist donors can browse and check off, including
  a sector dropdown for Rushaga Community Primary School (Administration
  Block, Boys' Dormitory, Dining Hall, Teachers' House, Staff & School Fees)
- A "Get Involved" section for volunteering on-trip + St Barts events/newsletter
- **Working donations** via real PayPal Smart Payment Buttons (no backend)
- Contact + footer linking back to the main safari site
- Your logo in the header (gorilla mark + wordmark), footer (gorilla mark),
  and browser tab (favicon), all cut from the artwork you provided

---

## 1. File structure

```
index.html
assets/
  logos/
    logo_gorilla_ivory.png   (header + footer mark)
    logo_gorilla_gold.png    (spare — gold version of the mark)
    logo_lockup_ivory.png    (spare — gorilla + full 3-line wordmark)
    logo_full_ivory.png      (spare — gorilla + wordmark + island outline)
    favicon-16.png, favicon-32.png, favicon-48.png, favicon-180.png
```

Keep this folder structure intact when you upload to GitHub — `index.html`
references the images by their relative path (`assets/logos/...`), so if the
folder moves, the logo and favicon will break.

---

## 2. Put this on GitHub Pages

1. Create a new repository on GitHub (e.g. `stbarthgorillafund`).
2. Upload `index.html` **and the entire `assets` folder** to the root of the
   repo, preserving the folder structure above.
3. In the repo, go to **Settings → Pages**.
4. Under "Build and deployment," set **Source: Deploy from a branch**,
   branch **main**, folder **/(root)**. Save.
5. GitHub will give you a URL like `https://yourusername.github.io/stbarthgorillafund/`
   within a minute or two.
6. **Optional — use your real domain (stbarthgorillafund.org):**
   - In the same Pages settings, add your custom domain under "Custom domain."
   - At your domain registrar, point the domain to GitHub Pages:
     add four `A` records for the apex domain to GitHub's IPs
     (`185.199.108.153`, `.109.153`, `.110.153`, `.111.153`), and a `CNAME`
     record for `www` pointing to `yourusername.github.io`.
   - GitHub will auto-create a `CNAME` file in your repo once you save the
     custom domain — leave it there.

That's it — no build step, no dependencies, nothing to compile.

---

## 3. Turn on real donations (PayPal)

Both donate buttons (the main "Support the Fund" form and the Registry's
"Give These Items") use PayPal's **JS SDK Smart Payment Buttons**. They
create and capture the order entirely in the browser — no backend needed.

1. Open `index.html`, and near the top of `<head>` find the PayPal SDK
   `<script src="https://www.paypal.com/sdk/js?client-id=test&currency=USD...">`
   tag.
2. `client-id=test` is PayPal's **public sandbox/demo ID** — buttons render
   and work end-to-end, but no real money moves with it.
3. Go to developer.paypal.com → **Apps & Credentials** → your app → the
   **Live** tab (not Sandbox) → copy the **Client ID**.
4. Replace `test` in the script URL above with that Client ID. Commit and push.

That's the only step required to go live — both buttons on the page share
this one script tag.

**Monthly giving:** currently shown as a note directing people to email you,
since recurring billing needs a Subscription Plan set up in your PayPal
dashboard first (a different flow from one-time Smart Buttons). Happy to wire
that up once you've created a plan, if you'd like.

### Alternative: Stripe instead of PayPal
If you'd rather use Stripe, replace the `paypal.Buttons(...)` blocks (search
`DONATION MODULE` near the bottom of the `<script>` tag) with a redirect to a
Stripe Payment Link, e.g. `window.open('https://buy.stripe.com/your-link')`,
using the same amount/description logic already built.

---

## 4. "Not Secure" warning in the browser

This is a DNS/certificate issue on GitHub's side, not something in the code:

1. **GitHub hasn't issued an SSL certificate for your domain yet.** GitHub
   auto-provisions a free HTTPS certificate once your custom domain's DNS
   correctly points to GitHub Pages — but only *after* DNS is verified, and
   it can take anywhere from a few minutes to ~24 hours.
2. **"Enforce HTTPS" isn't turned on.** Go to **Settings → Pages**. Once the
   custom domain shows no DNS errors, a checkbox labeled **"Enforce HTTPS"**
   becomes available (it's greyed out until the certificate is ready). Check it.

If it's been more than a day since DNS started resolving correctly and the
checkbox is still greyed out, remove the custom domain from Pages settings,
save, then re-add it — this forces GitHub to re-request the certificate.

Once enabled, `http://stbarthgorillafund.org` auto-redirects to `https://`
and the warning disappears.

---

## 5. Things you'll likely want to personalize

- **Logo:** the header uses the small gorilla mark next to your text
  wordmark; the footer uses the mark above the text. The spare files in
  `assets/logos/` (full lockup, gold version, full seal with the island) are
  there if you'd like to swap any of them in elsewhere.
- **Photography:** intentionally photo-free (no stock images used, to avoid
  using photos your organization doesn't hold rights to). Drop your own
  licensed photography into a folder and reference it in the `.hero`,
  partner cards, etc. — happy to wire that up once you have images picked.
- **Registry amounts:** Rushaga's sector figures are converted from the
  school's UGX quotations at roughly $1 = 3,700 UGX; FZS's tiers are
  converted from EUR at roughly €1 = $1.15. Both drift with the exchange
  rate — update the `data-amt` values and visible `$` labels in the Registry
  section whenever you want to refresh them.
- **Contact details:** currently show Wellesley, MA and a placeholder
  `fund@stbarthgorillafund.org` — update to your real inbox.
- **Newsletter signup:** currently just shows a confirmation alert. Wire it
  to a real list (Mailchimp, Formspree, etc.) by replacing the
  `newsletterBtn` click handler with a POST to your provider's API/form
  endpoint.

---

## 6. Local preview
Open `index.html` directly in a browser — as long as the `assets` folder
sits next to it, the logo and favicon will load correctly. The PayPal
buttons will render using the sandbox `client-id=test` until you swap in
your live Client ID (step 3 above).
