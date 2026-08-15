[README.md](https://github.com/user-attachments/files/31107331/README.md)
# Saint Barth Gorilla Fund — Website

A single-file static site (`index.html`) styled to match the parent brand,
[stbarthgorillaexpeditions.com](https://www.stbarthgorillaexpeditions.com/):
dark, ivory/gold, serif + sans pairing, minimal luxury layout.

## What's inside
- Hero, mission, "how it works" pillars
- A partner directory pulled from your nonprofit list, grouped by Tanzania / Rwanda / Uganda
- A "Field Needs" ledger with sample itemized needs (edit freely — see below)
- A "Get Involved" section for volunteering on-trip + St Barts events/newsletter
- A **working donation form** (PayPal — see setup below)
- Contact + footer linking back to the main safari site

Everything is in one file, so it's simple to host and simple to edit.

---

## 1. Put this on GitHub Pages

1. Create a new repository on GitHub (e.g. `stbarthgorillafund`).
2. Upload `index.html` to the root of the repo (drag-and-drop on github.com works,
   or via git: `git add index.html && git commit -m "site" && git push`).
3. In the repo, go to **Settings → Pages**.
4. Under "Build and deployment," set **Source: Deploy from a branch**,
   branch **main**, folder **/(root)**. Save.
5. GitHub will give you a URL like `https://yourusername.github.io/stbarthgorillafund/`
   within a minute or two.
6. **Optional — use your real domain (stbarthgorillafund.org):**
   - In the same Pages settings, add your custom domain under "Custom domain."
   - At your domain registrar, point the domain to GitHub Pages:
     add an `A` record for the apex domain to GitHub's IPs
     (`185.199.108.153`, `.109.153`, `.110.153`, `.111.153`), or a `CNAME`
     record for `www` to `yourusername.github.io`.
   - GitHub will auto-create a `CNAME` file in your repo once you save the
     custom domain — leave it there.

That's it — no build step, no dependencies, nothing to compile.

---

## 2. Turn on real donations (PayPal)

The donate button is already wired up — it just needs your real PayPal
business email in one spot.

1. Open `index.html`, search for `PAYPAL_BUSINESS_EMAIL`
   (near the bottom, in the `<script>` block).
2. Replace the placeholder with the email tied to your PayPal **Business**
   account (create one free at paypal.com if you don't have one yet —
   nonprofits can also apply for PayPal's reduced nonprofit transaction fees).
3. Commit and push the change. Donations now go straight to that PayPal
   account — no server, database, or payment code required. PayPal hosts
   the actual checkout page.
4. **Monthly giving (optional):** PayPal one-click donate links don't support
   recurring gifts natively. To offer monthly giving:
   - In your PayPal business account, create a **Recurring Payments /
     Subscribe hosted button**.
   - Copy its "hosted button ID" into `MONTHLY_HOSTED_BUTTON_ID` in the script.
   - The "Monthly" toggle will then route to that subscription button
     automatically.

### Alternative: Stripe instead of PayPal
If you'd rather use Stripe (often nicer checkout, still no backend needed):
1. Create a **Stripe Payment Link** in your Stripe Dashboard (Payment Links →
   New) for a flexible/custom amount.
2. Replace the `donateBtn` click handler's PayPal logic with:
   `window.open('https://buy.stripe.com/your-link', '_blank')`
   You can create a few Payment Links (one-time vs. monthly) and swap the
   URL based on the `selectedFreq` variable the same way the PayPal logic
   does.

---

## 3. Things you'll likely want to personalize

- **Logo:** currently text-based (`Saint Barth Gorilla Fund`). If you have a
  logo mark like the one on the main site, replace the `.brand` block in the
  header/footer with an `<img>` tag.
- **Photography:** the site is intentionally photo-free right now (no stock
  images were used, to avoid using photos your organization doesn't hold
  rights to). Drop your own licensed photography into a `/assets/images/`
  folder and reference it in the `.hero`, partner cards, etc. — I'm happy to
  wire that up once you have images picked out.
- **Field Needs ledger:** pulled directly from the quotations in your PDF —
  update amounts/items any time by editing the `.ledger-row` blocks.
- **Contact details, phone/email:** currently mirror the main site's phone
  number and a placeholder `fund@stbarthgorillafund.org` address — update to
  your real inbox.
- **Newsletter signup:** currently just shows a confirmation alert. Wire it to
  a real list (Mailchimp, Formspree, etc.) by replacing the `newsletterBtn`
  click handler with a POST to your provider's API/form endpoint.

---

## 4. Local preview
Just open `index.html` directly in a browser — no server needed to look at
the design (the donate button will still open real PayPal in a new tab once
you've set your email).
