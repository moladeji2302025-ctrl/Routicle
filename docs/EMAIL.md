# Email

Everything Routicle sends by email goes through one layer and one provider,
[Resend](https://resend.com). This is what it does, and the steps to switch it
on.

## What gets sent

| Email | When | Can be turned off? |
| --- | --- | --- |
| Welcome | Once, after sign-up | No |
| Receipt | A payment is confirmed | No |
| Payment failed | A renewal doesn't go through | No |
| Plan cancelled | A plan is cancelled | No |
| Workspace invite | Someone is invited to a team | No |
| Account locked | Five wrong passwords | No |
| Account deletion code | Someone asks to delete their account | No |
| Newsletter confirmation | Someone signs up on the public feed | No |
| Upload received / approved / not approved | A creator submits, or a reviewer decides | Yes: *Upload review results* |
| Client answered your form | A client submits a Business Suite discovery form | Yes: *Client form responses* |
| Newsletter | An admin sends one | Unsubscribe link in every copy |

"No" means it is sent regardless of settings: receipts, security notices and
invites are things a person needs. Choices are stored on the server
(`email_preferences`), because the code that sends email can't read the browser.

Not built, because there is nothing behind them yet: **new work from creators you
follow** (follows aren't stored on the server) and **payout statements** (there
is no payout system yet). Their toggles in Settings exist but don't send.

## How it fits together

```
api/_lib/mailer.js          the transport: Resend (or SMTP), retries, batch, error wording
api/_lib/email/index.js     deliver(): the one way to send. Suppression, preferences,
                            duplicate protection, logging. Plus the notify*() helpers
api/_lib/email/templates.js every email's wording
api/_lib/email/layout.js    the shared look, and the safe newsletter markup
api/_lib/email/store.js     tables: log, suppressions, preferences, broadcasts
api/email/webhook.js        Resend → us: delivered, bounced, complained
api/_lib/handlers/adminEmail.js, adminNewsletter.js    the admin console's API
src/pages/admin/AdminEmailPage.jsx                     Admin > Email
```

`deliver()` never throws by default, so a failed courtesy email can't fail the
payment or approval that triggered it. Invites and verification codes pass
`throwOnError`, because there the email *is* the request.

Every attempt is logged, including ones that were skipped (Admin > Email > Sent
mail), so "why didn't they get it?" always has an answer. The log stores an
address and a subject line, never a body, link or code.

## Setting it up

You need a domain you control. **`routicle.vercel.app` will not work**: you don't
own its DNS, and Resend only delivers to arbitrary people from a verified domain.
Until then it can send only to your own Resend login.

### 1. Create the Resend account and verify a domain

1. Sign up at resend.com.
2. **Domains → Add Domain.** Use a subdomain such as `mail.yourdomain.com` if you
   want to keep it apart from your everyday email.
3. Resend shows DNS records to add at wherever your domain's DNS lives (your
   registrar, Cloudflare…): a **DKIM** TXT, an **SPF** TXT, and an **MX** for
   bounces. Copy them exactly.
4. Add a **DMARC** record yourself, which Resend recommends but doesn't require:
   a TXT on `_dmarc.yourdomain.com` with
   `v=DMARC1; p=none; rua=mailto:you@yourdomain.com`. Start with `p=none`, watch
   the reports for a few weeks, then tighten it.
5. Click **Verify** in Resend. It usually takes minutes, occasionally hours.

### 2. Make an API key

**API Keys → Create API Key**, permission **Sending access**, restricted to your
domain. Sending access is enough and is safer than Full access: if the key ever
leaks it can send but can't read anything or change your account.

(The admin Setup page can only report domain status with a Full access key. With
a sending key it says so and asks you to check resend.com/domains yourself. That
is fine.)

### 3. Add the webhook

**Webhooks → Add Webhook.**

- Endpoint: `https://<your-domain>/api/email/webhook`
- Events: tick all the `email.*` events.
- Copy the **signing secret** (starts with `whsec_`).

This is what tells us an address bounced or someone reported you as spam, so we
stop mailing them. Skip it and you'll keep mailing dead addresses, and a bad
reputation makes *every* email land in spam, receipts included.

### 4. Set the variables in Vercel

Project → Settings → Environment Variables (Production), then redeploy:

| Variable | Value |
| --- | --- |
| `RESEND_API_KEY` | the key from step 2 |
| `MAIL_FROM` | `Routicle <hello@yourdomain.com>` (an address on the verified domain) |
| `MAIL_REPLY_TO` | a mailbox someone reads. The welcome email invites replies |
| `RESEND_WEBHOOK_SECRET` | the `whsec_…` from step 3 |
| `APP_URL` | your real address, e.g. `https://yourdomain.com`. Used for every link in every email |
| `MAIL_FROM_NEWSLETTER` | optional: a separate sender for the newsletter |

You can remove `SMTP_USER` and `SMTP_PASS`. They are only a fallback used when
`RESEND_API_KEY` is unset.

### 5. Check it

Go to **Admin → Email → Setup.** Every row should be green. Then send yourself a
test: pick a template from the dropdown to receive it with sample data.

Open the test in Gmail, **⋮ → Show original**, and check that **SPF, DKIM and
DMARC all say PASS**. If any say FAIL or NEUTRAL, fix the DNS before you send to
anyone else.

### 6. Sign-up and password-reset email (Neon Auth)

Those two are sent by Neon Auth, not by Routicle, and by default they come from a
shared "Neon Auth" address. To send them as Routicle, in the **Neon console →
your project → Auth → Configuration → Email provider**, switch to custom SMTP:

| Setting | Value |
| --- | --- |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | your Resend API key |
| Sender | an address on your verified domain |

This can't be changed from the code. It matters most for password reset, which is
otherwise the one email that arrives from a name people don't recognise.

## Sending the newsletter

**Admin → Email → Newsletter.** Write it, use **Send test to me**, and check it in
a real inbox. **Send** goes to everyone who confirmed their address, minus anyone
who bounced or reported spam.

- It is written as plain text with a little markup (`# heading`, `**bold**`,
  `[text](url)`, `- bullet`), so it can't break the layout.
- It goes out in batches of 50, from the page. **Keep the page open** while it
  sends. If you close it, come back and it can resume: every recipient is
  recorded before they're mailed, so nobody gets it twice.
- Every copy has an unsubscribe link, plus the one-click `List-Unsubscribe`
  header Gmail and Apple Mail use for their own Unsubscribe button. A spam
  complaint counts as an unsubscribe.

## Limits and habits worth knowing

- **Check Resend's current sending limits** for your plan. A daily cap can stop a
  large newsletter part-way; the affected recipients show as failed and can be
  retried the next day.
- **Warm up gradually.** A new domain that suddenly sends thousands of emails looks
  like spam. Start small.
- **Don't buy or import lists.** Only people who confirmed on the site are
  included, and that's what keeps complaint rates near zero.
- The email log isn't pruned automatically. Delete old rows periodically if it
  grows: `DELETE FROM email_log WHERE created_at < now() - interval '90 days'`.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| "Resend will only deliver to your own address" | No verified domain yet, or `MAIL_FROM` still `onboarding@resend.dev` |
| "Resend rejected the API key" | Wrong or revoked `RESEND_API_KEY`, or not redeployed after setting it |
| Test arrives but lands in spam | DNS: check SPF/DKIM/DMARC in "Show original" |
| A person says they got nothing | Admin → Email → Sent mail, search their address. `skipped` means they switched it off; `suppressed` means an earlier email bounced |
| Bounces don't appear as suppressed | Webhook missing or `RESEND_WEBHOOK_SECRET` wrong. Resend's webhook page shows failed deliveries |
| Links in emails go to the wrong place | `APP_URL` not set |
