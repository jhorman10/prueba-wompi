# Tasks: Credit Card Payment Checkout

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 1500–2500 |
| 800-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Backend) → PR 2 (Mobile) → PR 3 (Integration + Polish) |
| Delivery strategy | ask-on-risk |
| Chain strategy | feature-branch-chain (PR 1 done) |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
800-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Backend: Nest.js products + payments modules | PR 1 | base=dev (tracker); standalone, testable |
| 2 | Mobile: 7 screens + Redux + navigation | PR 2 | base=PR#1 branch; independent of backend |
| 3 | Integration: API wiring, Docker, .apk | PR 3 | base=PR#2 branch; depends on PR 1+2 |

## Phase 1: Foundation

- [x] 1.1 Create `mobile/package.json` with React Native, Redux, react-navigation deps
- [x] 1.2 Create `backend/package.json` with Nest.js, TypeORM, SQLite deps
- [x] 1.3 Create `backend/src/main.ts` — NestJS bootstrap with CORS, global prefix
- [x] 1.4 Create `backend/src/config/env.config.ts` — gateway URL, port, env vars

## Phase 2: Backend Core

- [x] 2.1 Create `product.entity.ts` + `product.repository.ts` interface (domain layer)
- [x] 2.2 Create `get-products.usecase.ts` + `products.controller.ts` + TypeORM repo (GET /api/products)
- [x] 2.3 Create `transaction.entity.ts` + `transaction-status.enum.ts` (PENDING→PROCESSING→COMPLETED/FAILED)
- [x] 2.4 Create `payment-gateway.interface.ts` — `tokenize()`, `charge()`, `getStatus()`
- [x] 2.5 Create `tokenize-card.usecase.ts` — card→gateway token, no storage of raw number
- [x] 2.6 Create `process-payment.usecase.ts` — pipeline: create→tokenize→charge→stock decrement, idempotency
- [x] 2.7 Create `payments.controller.ts` — POST /tokenize, POST /charge, GET /:id
- [x] 2.8 Create `sandbox-payment-gateway.ts` — 3 retries, exp backoff (1s/2s/4s), config-driven URL

## Phase 3: Mobile Core

- [ ] 3.1 Create Redux store + 4 slices: `productsSlice`, `cartSlice`, `checkoutSlice`, `transactionsSlice`
- [ ] 3.2 Create `api.ts` (Axios client), `encryption.ts` (redux-persist encrypt transformer), `cardDetection.ts` (Luhn + brand regex)
- [ ] 3.3 Create 7 screens: Splash, Home, SelectProduct, Checkout, CardInfo, PaymentSummary, TransactionStatus
- [ ] 3.4 Create components: `ProductCard`, `CardInput` (brand logos), `PriceTag`
- [ ] 3.5 Create `AppNavigator.tsx` (stack nav, 7 screens) + `App.tsx` (store provider + nav)

## Phase 4: Integration

- [ ] 4.1 Wire `api.ts` to backend endpoints (`/api/products`, `/api/payments/*`)
- [ ] 4.2 Wire encrypted storage transformer to `redux-persist` (cart/checkout/transactions slices)
- [ ] 4.3 Configure gateway URL in `.env` (zero "Wompi" in source code rule)

## Phase 5: Testing

- [x] 5.1 Write backend unit tests: use cases, gateway mock, stock validation (≥80% coverage)
- [ ] 5.2 Write mobile unit tests: cardDetection (Luhn/brand), Redux slices, screen smoke tests (≥80%)
- [x] 5.3 Run `npx jest --coverage` on both layers — verify ≥80% threshold (backend: 95.63% stmts, 80.32% branches, 97.36% funcs, 96.42% lines)

## Phase 6: Polish

- [ ] 6.1 Create `backend/Dockerfile` (Node 20, build, start)
- [ ] 6.2 Verify `.apk` builds with `cd mobile && npx react-native build-android`
- [ ] 6.3 Grep source for "Wompi" — zero matches outside `.env`
