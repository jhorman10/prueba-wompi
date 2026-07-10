# Proposal: Credit Card Payment Checkout

## Intent

Complete Credit Card Payment Checkout (React Native + Nest.js) with sandbox payment gateway. 7-step flow: Splash → Home → Select Product → Checkout → Credit Card Info → Payment Summary → Transaction Status.

## Scope

### In Scope
- 7-screen React Native flow + Redux state management
- Nest.js backend: payment pipeline (create PENDING → tokenize → process → assign product → update stock) + product catalog
- Payment gateway integration (abstracted as "payment-gateway")
- CC validation with brand detection (Visa/MC logos)
- Encrypted storage (redux-persist + react-native-encrypted-storage)
- Unit tests ≥80% (Jest) for both layers
- Dockerfile for backend
- Monorepo: `mobile/` + `backend/`

### Out of Scope
- iOS .ipa (only .apk required)
- Cloud deployment (bonus, deferred)
- CI/CD pipelines
- Product CRUD (seed data, GET-only)

## Capabilities

### New Capabilities
- `payment-checkout`: Full checkout flow — cart, card form, payment summary, transaction result screens. Mobile UI + Redux state + encrypted persistence.
- `product-catalog`: Product listing and selection. Backend GET endpoint serving seed data + mobile product list/detail screens.
- `payment-gateway-integration`: Gateway abstraction layer. Tokenization, payment processing, status calls via sandbox. Config-only gateway references.

### Modified Capabilities
- None (greenfield project).

## Approach

Monorepo: `mobile/` (React Native + Redux), `backend/` (Nest.js + hexagonal architecture). Mobile collects card data → backend tokenizes via gateway API → processes → updates stock. redux-persist + encrypted storage for crash resilience. Gateway name limited to config/env.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `mobile/` | New | React Native: 7 screens, Redux, encrypted persistence |
| `backend/` | New | Nest.js: product + payment modules, hexagonal |
| `backend/Dockerfile` | New | Container definition |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Gateway sandbox flakiness | Low | Retry + backoff; mock in tests |
| Card data through backend | Med | Sandbox only; production needs edge tokenization |
| "Wompi" leaked in code | Low | Grep check; config/env-only rule |

## Rollback Plan

Greenfield — remove `mobile/` and `backend/` directories. No data migration (seed data only).

## Dependencies

- Gateway sandbox credentials (in config/env)
- Node.js 20+, npm/yarn
- React Native CLI + Android SDK

## Success Criteria

- [ ] 7-screen mobile flow runs without crashes (iPhone SE resolution: 1334×750)
- [ ] Backend completes full payment cycle (PENDING → success/failure)
- [ ] Unit tests ≥80% coverage on mobile and backend
- [ ] No "Wompi" word in source code, comments, or repo metadata
- [ ] .apk builds successfully
- [ ] Transaction data survives app restart (encrypted storage)
