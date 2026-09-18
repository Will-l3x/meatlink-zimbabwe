# MeatLink Zimbabwe (Hexad Market)

Next.js 16 + Prisma (MongoDB) storefront for ordering meat cuts online or via a WhatsApp bot, paid through ZB Smile & Pay, with an admin logistics board for weekly Harare deliveries.

## Architecture

- **Web app** — `app/` (App Router). Shop → checkout → ZB payment → `/checkout/zb-return` status page. Client pages keep a copy of the logged-in user's display data in `localStorage`; real authentication is an httpOnly signed session cookie (`lib/session.ts`).
- **API routes** — `app/api/*`. Admin data, orders, deliveries and wallet credits require an `ADMIN` session. Payment initiation requires any session. The ZB callback and status poll are public but verify every status directly with ZB before settling.
- **Payments** — `lib/payment-initiation.ts` starts a ZB checkout (shared by the website and the bot); `lib/payment-settlement.ts` moves a payment PENDING → COMPLETED/FAILED exactly once and runs side effects.
- **Fulfilment** — `lib/order-fulfillment.ts` turns a paid order into Recipient / Hamper / Subscription / Delivery records server-side, so orders appear on the admin board even if the customer closes the browser.
- **WhatsApp bot** — `app/api/whatsapp/webhook` → `lib/chatbot.ts` (Meta Cloud API, reply buttons).

## Environment variables

Set these in your hosting environment before deploying:

```bash
DATABASE_URL="mongodb+srv://..."          # required
SESSION_SECRET="long-random-string"       # required in production (signs login cookies)
PASSWORD_SALT="..."                        # only needed to verify pre-existing legacy password hashes
NEXT_PUBLIC_BASE_URL="https://your-domain" # public origin used in payment redirect URLs (falls back to Vercel URL)

WHATSAPP_TOKEN=""
WHATSAPP_PHONE_NUMBER_ID=""
WHATSAPP_VERIFY_TOKEN="hexad_market_verification"
ORDER_NOTIFY_WHATSAPP="27765762104"       # owner number that receives order alerts

ZB_API_KEY=""
ZB_API_SECRET=""
ZB_API_URL="https://zbnet.zb.co.zw/wallet_sandbox_api/payments-gateway"
ZB_SANDBOX="true"                          # set to "false" with the production ZB_API_URL
```

Generate a secret with `openssl rand -base64 48`.

## Local development

```bash
npm install
npx prisma generate
npm run dev
```

## Production build

```bash
npm run build
npm run lint
```

## Deployment checklist

- Set every variable above in Vercel (Production and Preview). Without `SESSION_SECRET`, login and registration return 503 in production.
- Point ZB's result URL at `https://<domain>/api/payments/zb-smilenpay/callback` and switch `ZB_API_URL` / `ZB_SANDBOX` to production values.
- Point Meta's webhook at `https://<domain>/api/whatsapp/webhook` with `WHATSAPP_VERIFY_TOKEN`.
- Create the first admin by setting `role: "ADMIN"` on a user document in MongoDB (there is deliberately no self-service admin sign-up).
- Health check: `GET /api/health`. WhatsApp/DB diagnostics: `GET /api/whatsapp/webhook?diag=1&token=<WHATSAPP_VERIFY_TOKEN>`.
- After deploying, walk through: register/login → add cuts → checkout → pay in ZB sandbox → return page shows success → order appears on the admin Orders board → owner WhatsApp alert received.

## Known gaps

- `/driver`, `/admin/accounts`, `/admin/finances` and `/admin/reports` still render hard-coded demo data and are not linked from the live admin panel.
- Subscriptions created from a one-off payment are `isActive: true`; "Generate Next Batch" schedules deliveries for every active subscription regardless of frequency or payment. Decide on the recurring-billing model before enabling it for customers.
- Product catalogue and prices are hard-coded in `app/shop/page.tsx`, `app/page.tsx` and `lib/chatbot.ts` and must be kept in sync manually.
