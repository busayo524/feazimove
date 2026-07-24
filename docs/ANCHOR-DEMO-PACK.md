# FeaziMove × Anchor — Pre-Go-Live Demo Pack

Anchor's go-live process ([docs.getanchor.co/docs/going-live](https://docs.getanchor.co/docs/going-live)):
① complete sandbox integration → ② onboarding questionnaire + SLA → ③ **pre-go-live video call
(this demo)** → ④ KYB approval → live keys. This pack maps FeaziMove's setup onto the four
things to show on that call.

---

## Item 1 — "End-to-end endpoint testing, ensuring it returns 200"

**What to show:** the endpoint table in `docs/ANCHOR-TESTING-GUIDE.md` Part 1, executed live.

Suggested live sequence (5 minutes, screen-share a terminal or Postman):
1. `GET /health` → 200 (build version).
2. `POST /api/auth/login` → 200 (token).
3. `POST /api/wallet/fund {"amount":1500}` → 200 with a real sandbox NUBAN in the response.
4. Dashboard **Simulate Transfer** → `GET /api/wallet/fund/status/{ref}` flips to `completed` → 200.
5. `GET /api/admin/anchor/overview` → 200 (counters just moved).
6. `POST /api/admin/payouts/{id}/approve` → 200 with a transferId, visible in Anchor's dashboard.

**Talking point:** all Anchor calls go through one client module (`backend/services/anchor.js`),
authenticated with `x-anchor-key`, JSON:API format, sandbox base URL switchable to live by env var.

## Item 2 — "Back office where we monitor transactions and have details of all customers"

**What to show:** Admin panel → **Back Office** (`/admin/back-office`).
- **Overview cards**: Anchor customers, webhook events (24h), total collections, open AML flags,
  live connection status + last-event time.
- **Transaction Monitor tab**: every webhook event Anchor has ever sent us — type, resource id,
  signature validity, processed state. Backed by the `anchor_events` table: an immutable audit
  log (unique event ids make redelivery idempotent).
- **Customers tab**: every user onboarded to Anchor — name, contact, role, Anchor Customer ID,
  KYC status, reserved account details, payout beneficiary status.
- Also: **Payments** page shows the money view (wallet balances, payouts, revenue), and every
  admin action is written to the activity log.

## Item 3 — "A system showing how we monitor transactions and anti-money laundering"

**What to show:** Back Office → **AML Flags** tab, plus one live demonstration
(simulate a ₦250,000 transfer → flag appears within seconds → mark it reviewed).

Rule engine (`backend/services/walletLedger.js`), evaluated automatically on every credit and
every payout request; thresholds are configuration, adjustable without code changes:

| Rule | Trigger (default) | Severity |
|------|-------------------|----------|
| `large-topup` | Single credit ≥ ₦200,000 | high |
| `rapid-topups` | > 5 gateway credits within 24h | medium |
| `high-weekly-volume` | ≥ ₦1,000,000 funded within 7 days | high |
| `fast-in-out` | Payout requested within 60 min of funding (layering pattern) | high |

Compliance workflow: flags open → reviewed/dismissed by a named admin with timestamp (full audit
trail). Supporting posture points:
- **BVNs are never stored by FeaziMove** — passed through to Anchor for CBN KYC only.
- Webhooks are HMAC-SHA1 signature-verified; deliveries that fail verification are never trusted —
  any payment/transfer they claim is independently confirmed against Anchor's authenticated API
  before a single kobo moves (and forgery attempts are themselves logged).
- Money can only enter a wallet via verified Anchor events; credits are idempotent (no double
  crediting on redelivery) and amount-checked (short payments never credit in full).
- Payout money leaves only after: driver step-up email 2FA → admin approval → Anchor-verified
  beneficiary → NIP transfer; failures auto-refund exactly once.

## Item 4 — "Demo all our setup + final compliance/billing checks"

**Suggested 15-minute call script:**
1. **Who we are** (2 min): FeaziMove = scheduled commuter carpooling in Lagos; riders prepay a
   wallet, drivers earn per ride, platform takes a % fee. Use cases for Anchor: collections
   (wallet funding via virtual accounts), reserved accounts per rider, NIP payouts to drivers.
2. **Rider flow live** (4 min): sign up → wallet top-up via Pay-with-Transfer → simulate →
   instant credit → book a ride paid from wallet. Then the reserved-account setup with BVN.
3. **Driver flow live** (3 min): earnings → withdrawal with email 2FA → admin approval →
   sandbox NIP transfer visible in Anchor dashboard.
4. **Back office + AML** (4 min): items 2 and 3 above, including the live large-topup flag demo.
5. **Compliance/billing answers to have ready** (2 min):
   - **Fee allocation** (they will ask): decide whether Anchor's per-transaction fees are absorbed
     by FeaziMove's account or passed to customer accounts. Recommendation: absorb into the
     platform fee (simpler rider pricing) — confirm on the call.
   - KYC model: individual customers, Level-2 (BVN) only for reserved accounts.
   - Data handling: BVN pass-through (never stored), webhook audit log, AML review trail.
   - Settlement: single master deposit account funds payouts; reserved-account collections
     settle to it.

**Before the call:** complete Anchor's onboarding questionnaire + SLA (their step ②), and have
the KYB documents for the business entity ready — approval typically 24h–a few days after.
