# FeaziMove × Anchor — Sandbox Testing Guide

Everything runs in Anchor's **sandbox** (fake money): base URL `https://api.sandbox.getanchor.co`.
FeaziMove's test backend: `https://feazimove-api-10128445142.development.catalystappsail.com`
FeaziMove's test web app: `https://feazimove-929573268.development.catalystserverless.com/app/`

> The production site (www.feazimove.com) is untouched — it stays on the old payment
> flow until Anchor approves go-live. Do NOT promote v1.2.x to Production until then.

---

## Part 0 — One-time setup checklist

1. **API key** — created in Anchor Dashboard → Developers → API Keys; pasted into `backend/.env` as `ANCHOR_API_KEY`. ✅ (verified working)
2. **Webhook** — Anchor Dashboard → Settings → Developers → Webhooks → Add Webhook:
   - URL: `https://feazimove-api-10128445142.development.catalystappsail.com/api/anchor/webhook`
   - Delivery mode: **Included** (full resource payloads)
   - Secret token: the value of `ANCHOR_WEBHOOK_TOKEN` in `backend/.env` (both sides must match)
   - Events: select all (at minimum: payin.*, payment.*, nip.transfer.*, book.transfer.*, customer.*, reservedAccount.*)
3. **Backend deployed** — upload `backend/feazimove-backend-PRODUCTION.zip` (v1.2.x) to **AppSail → feazimove-api → Development** via Create Deployment. Confirm: open
   `https://feazimove-api-10128445142.development.catalystappsail.com/health` → `{"status":"ok","version":"1.2.x"}`.

---

## Part 1 — What each FeaziMove endpoint does (and how to test it returns 200)

Get a token first (any test rider account):

```
POST {API}/api/auth/login
Body: { "identifier": "<email>", "password": "<password>" }
→ 200 { token, refreshToken, user }
```

Use `Authorization: Bearer <token>` on everything below. `{API}` = the Dev backend URL above.

| # | Endpoint | What it does | Expected |
|---|----------|--------------|----------|
| 1 | `GET /health` | Liveness + build version (no auth) | 200 `{status:"ok"}` |
| 2 | `POST /api/wallet/fund` body `{"amount": 1500}` | Creates your Anchor customer (first call only), then a **temporary bank account** (Pay-with-Transfer) for exactly ₦1,500 | 200 `{reference, transfer:{bankName, accountNumber, accountName, amount, expiresInSeconds}}` |
| 3 | `GET /api/wallet/fund/status/{reference}` | Reports whether the transfer for that reference has landed | 200 `{status:"pending"}` → after payment `{status:"completed"}` |
| 4 | `GET /api/wallet/balance` | Wallet balance (naira + exact kobo) | 200 `{balance, balanceKobo}` |
| 5 | `POST /api/wallet/reserved-account` body `{"bvn":"22222222226","dateOfBirth":"1990-01-01","gender":"male"}` | Completes the BVN wallet-setup step and assigns the permanent funding account (sandbox test BVN shown). Repeating it after setup → 409 | 202 `{message, account?}` (409 if already set up) |
| 6 | `GET /api/wallet/funding-account` | Returns the permanent account **once the BVN setup step is done** (`bvnSetUp:false, account:null` before that — the setup funnel is deliberate) | 200 `{bvnSetUp, account, pending}` |
| 7 | `POST /api/wallet/withdraw` | Driver payout request (needs step-up email code) — escrows the amount | 201 `{payoutId}` |
| 8 | `GET /api/wallet/transactions` | Ledger history | 200 `{transactions:[…]}` |
| 9 | `POST /api/anchor/webhook` | **Anchor-only** — event receiver. Signed deliveries verify by HMAC-SHA1; unsigned deliveries claiming a payment/transfer are confirmed against Anchor's API before anything is processed (never trusted directly) | 401 for garbage without a verifiable claim (that's correct!); 200 for genuine Anchor deliveries |

Admin endpoints (log in as admin):

| # | Endpoint | What it does | Expected |
|---|----------|--------------|----------|
| 10 | `GET /api/admin/anchor/overview` | Back-office stats: customers, events, collections, open AML flags | 200 |
| 11 | `GET /api/admin/anchor/events` | Webhook/event audit feed (every money movement) | 200 `{events:[…]}` |
| 12 | `GET /api/admin/anchor/customers` | Registry of all Anchor-onboarded customers | 200 `{customers:[…]}` |
| 13 | `GET /api/admin/aml/flags?status=open` | Open AML alerts | 200 `{flags:[…]}` |
| 14 | `POST /api/admin/aml/flags/{id}/review` body `{"outcome":"reviewed"}` | Marks a flag reviewed (audit-logged) | 200 |
| 15 | `GET /api/admin/payouts?status=pending` | Pending driver payout requests | 200 |
| 16 | `POST /api/admin/payouts/{id}/approve` | **Sends the money**: verifies driver's bank via Anchor, creates beneficiary, fires NIP transfer | 200 `{transferId}` |

Direct Anchor sanity checks (prove the key itself — replace `<KEY>`):

```
curl -H "x-anchor-key: <KEY>" https://api.sandbox.getanchor.co/api/v1/banks        → 200, ~290 banks
curl -H "x-anchor-key: <KEY>" https://api.sandbox.getanchor.co/api/v1/customers    → 200, customers you created
```

---

## Part 2 — Full user-journey test, step by step (do this yourself)

### A. Fund a wallet by transfer (Pay-with-Transfer)

1. Open the test web app (URL at top) and **log in as a rider** (create one via Sign Up if needed — use a real-looking email).
2. Go to **Wallet** → type an amount (e.g. ₦1,500) → **Add**.
3. A panel appears: *"Transfer to this account"* with a bank, a 10-digit account number, and the exact amount. In sandbox this is your **permanent Virtual NUBAN** (created by Anchor on your first payment and reused for all your later ones — the countdown only bounds the pending top-up, not the account); behind the scenes FeaziMove also created your Anchor Customer.
4. **Simulate the transfer** (sandbox has no real banks):
   - Log in to **app.getanchor.co** → make sure the environment toggle says **Sandbox**.
   - Go to **Accounts → Deposit Accounts** → click **Simulate Transfer** (this is the sandbox-only button per the [onboarding guide](https://docs.getanchor.co/docs/developer-onboarding-to-anchor-api)).
   - Enter the **account number shown in the FeaziMove wallet panel** as the destination, and the **exact amount** (₦1,500 → 150000 kobo if it asks in kobo).
   - Submit.
5. Watch the FeaziMove wallet page: within seconds the panel disappears and the balance shows **+₦1,500**. What happened: Anchor received the simulated transfer → notified our webhook → the payment was authenticated (by signature, or — because Anchor's sandbox signs organic deliveries incorrectly — by re-fetching it from Anchor's API with our key) → wallet credited.
6. **Verify in the back office**: log in as admin → **Back Office** → the Transaction Monitor shows the payment event marked **processed** (a `payment.processed` claim row; for organic sandbox deliveries the signature column reads *invalid* — expected, the API pullback is the verification). The Customers tab shows the rider with their Anchor Customer ID.

### B. Permanent account (reserved account, BVN)

1. As the rider, Wallet → **Your Personal Funding Account** → **Set Up My Account**.
2. Enter sandbox test BVN `22222222226`, any date of birth, gender → **Create My Account**.
3. Within moments the card shows a permanent account number in the rider's name (arrives via the `reservedAccount.created` webhook if not instant).
4. Repeat the **Simulate Transfer** trick to that account number with ANY amount — the wallet credits automatically with description "Wallet top-up — bank transfer". No pending amount was needed: this is the "transfer any time" account.

### C. Pay for a ride by transfer

1. As a rider with an empty (or low) wallet, go to **Book Ride**, pick a priced route/time, **Preview Route**.
2. You'll see **"Pay ₦X by transfer & book"** → tap it → the same transfer panel appears inside the modal.
3. Simulate the transfer for that exact amount → the moment it lands, the booking is **placed automatically** and the modal flips to "Matching you with a driver…".

### D. AML flags

1. Fund a wallet with a simulated transfer of **₦250,000** (over the ₦200k rule) → Back Office → **AML Flags**: a high-severity `large-topup` flag appears.
2. Click **Mark Reviewed** — it moves to the reviewed list with your name and timestamp (that's the compliance audit trail).

### E. Driver payout (real sandbox NIP transfer)

1. Log in as a **driver** who has wallet balance (complete a test ride, or fund via simulate-transfer) and has **bank details on their Profile** (bank name + 10-digit account; in sandbox use e.g. account `0000000000`–style test numbers Anchor accepts on verify).
2. Driver → Earnings/Wallet → **Withdraw** → enter amount → confirm the emailed 6-digit code (step-up security).
3. Log in as **admin** → **Payments** → pending payout → **Approve**.
   What happens: FeaziMove verifies the account with Anchor, saves the beneficiary, and fires a **NIP transfer** from your sandbox master account. Status flips pending → processing → **completed** when `nip.transfer.successful` arrives. If Anchor can't uniquely match the bank name, the approval asks you to pick the exact bank.
4. Check Anchor Dashboard → **Transfers**: your sandbox transfer is listed. Check Back Office → events: `nip.transfer.successful`.
5. **Failure path** (worth demoing): if a transfer fails, the payout is marked failed and the money returns to the driver's wallet automatically — exactly once.

---

## Troubleshooting

- **Panel never credits** → check Anchor Dashboard → Settings → Developers → Webhooks → your webhook → delivery logs. A 401 response means the secret token in the form ≠ `ANCHOR_WEBHOOK_TOKEN` in the deployed `.env`.
- **/wallet/fund returns 503** → `ANCHOR_API_KEY` missing in the DEPLOYED environment (re-zip + re-upload after editing `.env`).
- **Reserved account "failed"** → BVN didn't validate in sandbox; use the documented test BVN `22222222226`.
- Every webhook Anchor sends (valid or not) is recorded in the **Back Office → Transaction Monitor** — that's your first debugging stop.

---

## Important sandbox note (discovered Jul 24)

Anchor's `/pay/*` product (Pay-with-Transfer and Reserved Accounts) **only exists in
production for approved payment programs** — the sandbox returns "Endpoint not found".
FeaziMove handles this automatically: it tries the `/pay` endpoints first and falls back
to **Virtual NUBANs** (a permanent account number per user, pointing at the org's master
deposit account). Functionally identical for testing; when Anchor enables the payment
program in production, the code upgrades itself with no changes.

Practical effect on this guide:
- The account shown on a top-up is the user's permanent funding NUBAN (Providus Bank in
  sandbox) rather than a one-time account — Simulate Transfer to it exactly as described.
- The "personal funding account" (section B) returns the same NUBAN; the BVN is validated
  by the form but only used once production reserved accounts are enabled.
- Talking point for the pre-go-live call: ask Anchor to enable the payment program
  (Pay-with-Transfer + Reserved Accounts) for production.
