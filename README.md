# MeatLink Zimbabwe

This is a production-oriented Next.js app for MeatLink Zimbabwe with authentication, subscriptions, payments, admin delivery workflows, and WhatsApp integration.

## Production readiness checklist

- Authentication routes now use password hashing and clear database availability errors.
- Subscription, delivery, wallet, and payment routes now fail gracefully when the database is not configured.
- Admin and checkout flows now rely on the API layer instead of assuming everything is available locally.

## Environment variables

Set these in your hosting environment before deploying:

```bash
DATABASE_URL="mongodb+srv://..."
PASSWORD_SALT="change-me"
WHATSAPP_TOKEN=""
WHATSAPP_PHONE_NUMBER_ID=""
WHATSAPP_VERIFY_TOKEN="hexad_market_verification"
ZB_API_KEY=""
ZB_API_SECRET=""
ZB_API_URL="https://zbnet.zb.co.zw/wallet_sandbox_api/payments-gateway"
ZB_SANDBOX="true"
```

## Local development

```bash
npm install
npx prisma generate
npm run dev
```

## Production build

```bash
npm run build
```

## Deployment notes

- Ensure the MongoDB connection string is available at build/runtime.
- If the WhatsApp or payment providers are not configured, the app will still boot and return clear errors instead of crashing.
- Test the main user journeys after deployment:
  - register/login
  - checkout/payment return flow
  - subscription creation
  - admin order status updates
