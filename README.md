# Credit Card Payment Checkout

A monorepo credit card payment checkout system built with React Native (mobile) and Nest.js (backend). Implements a full 7-screen checkout flow with sandbox payment gateway integration, encrypted state persistence, and client-side card validation.

## Architecture Overview

### Monorepo Structure

```
├── backend/          # Nest.js API — hexagonal architecture
│   ├── src/
│   │   ├── config/           # Environment configuration
│   │   ├── modules/
│   │   │   ├── payments/     # Payment pipeline (tokenize, charge, status)
│   │   │   │   ├── domain/        # Entities, interfaces, enums
│   │   │   │   ├── application/   # Use cases (process-payment, tokenize-card)
│   │   │   │   └── infrastructure/# Controllers, gateway impl, repos
│   │   │   └── products/     # Product catalog
│   │   │       ├── domain/        # Product entity, repository interface
│   │   │       ├── application/   # Get products use case
│   │   │       └── infrastructure/# Controller, TypeORM repo
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── test/            # E2E tests
│   └── Dockerfile
├── mobile/           # React Native + Redux
│   ├── src/
│   │   ├── navigation/      # Stack navigator (7 screens)
│   │   ├── screens/         # 7 screens: Splash → Home → SelectProduct → Checkout → CardInfo → PaymentSummary → TransactionStatus
│   │   ├── components/      # ProductCard, CardInput, PriceTag, CartItem
│   │   ├── store/           # Redux store + 4 slices
│   │   │   └── slices/      # productsSlice, cartSlice, checkoutSlice, transactionsSlice
│   │   └── services/        # api.ts, encryption.ts, cardDetection.ts
│   └── App.tsx
├── .env.example
└── openspec/         # Spec-driven development artifacts
```

### Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Mobile Framework | React Native 0.86.0 | Cross-platform mobile app |
| State Management | Redux Toolkit 2 + redux-persist | Global state + encrypted persistence |
| Navigation | React Navigation 6 (native-stack) | 7-screen flow |
| Encryption | react-native-encrypted-storage | Secure card/transaction data at rest |
| Backend Framework | Nest.js 10 (TypeScript) | REST API |
| ORM | TypeORM + SQLite | In-memory data store |
| Payment Gateway | Abstracted `IPaymentGateway` interface | Sandbox integration (config-driven) |
| Testing | Jest (both layers) | Unit + integration tests |

### Payment Flow

```
Mobile App             Nest.js Backend          Payment Gateway
    │                        │                        │
    │  GET /api/products     │                        │
    ├───────────────────────>│                        │
    │<── Product[] ──────────│                        │
    │                        │                        │
    │  POST /api/payments/tokenize                    │
    │  {card details}        │                        │
    ├───────────────────────>│  tokenize(card)        │
    │                        ├───────────────────────>│
    │                        │<─── { token } ─────────│
    │<── { token } ──────────│                        │
    │                        │                        │
    │  POST /api/payments/charge                      │
    │  {token, productId,    │                        │
    │   quantity, idempotencyKey}                     │
    ├───────────────────────>│  validate stock ───┐   │
    │                        │  (stock ok?        │   │
    │                        │   else → 409)      │   │
    │                        │<────────────────────┘   │
    │                        │  charge(token, amt)     │
    │                        ├───────────────────────>│
    │                        │<── { status, ref } ────│
    │                        │  update product stock ─┐│
    │<── { transaction } ────│<────────────────────────┘│
```

### Redux Store Shape

| Slice | Key State | Persisted? |
|-------|-----------|------------|
| `products` | `items[]`, `loading`, `error` | No (fetched fresh) |
| `cart` | `items[{productId, quantity}]` | Yes (encrypted) |
| `checkout` | `step`, `cardInfo`, `token`, `transactionId` | Yes (encrypted) |
| `transactions` | `history[]`, `lastTransaction` | Yes (encrypted) |

## Setup Instructions

### Prerequisites

- Node.js 20+
- npm 9+
- React Native CLI + Android SDK (for .apk builds)
- Xcode (for iOS builds, optional)

### Backend Setup

```bash
cd backend
npm ci
cp .env.example .env
# Edit .env with your sandbox gateway credentials (or use defaults for dev)
npm run start:dev
```

The backend starts on `http://localhost:3000` with SQLite in-memory database. Seed data (3 products) is loaded automatically on startup.

### Mobile Setup

```bash
cd mobile
npm ci
cp .env.example .env   # creates mobile/.env with API_URL
# The backend URL is read from API_URL in mobile/.env (injected at build time
# by react-native-dotenv). Edit it for physical devices (use your LAN IP).
npx react-native start
```

In another terminal:
```bash
cd mobile
npx react-native run-android  # or npx react-native run-ios
```

> **Note**: The mobile app reads its backend URL from `API_URL` in `mobile/.env`
> (env-driven via `react-native-dotenv`). Update it for physical devices (use your
> machine's LAN IP instead of `localhost`).

### Docker (Backend Only)

```bash
cd backend
docker build -t checkout-backend .
docker run -p 3000:3000 \
  -e GATEWAY_URL=https://sandbox-gateway.example.com \
  -e GATEWAY_API_KEY=your-key \
  checkout-backend
```

## API Endpoints

All endpoints are prefixed with `/api`.

### Products

| Method | Endpoint | Description | Response |
|--------|----------|-------------|----------|
| `GET` | `/api/products` | List all products | `Product[]` |

**Product schema:**
```json
{
  "id": "uuid",
  "name": "Laptop",
  "description": "High-performance laptop with 16GB RAM and 512GB SSD",
  "price": 99999,
  "imageUrl": "/images/laptop.jpg",
  "stock": 10
}
```

### Payments

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/payments/tokenize` | Tokenize card details with gateway |
| `POST` | `/api/payments/charge` | Process a payment |
| `GET` | `/api/payments/:id` | Get transaction status |

#### `POST /api/payments/tokenize`

**Request body:**
```json
{
  "number": "4111111111111111",
  "expiry": "12/28",
  "cvc": "123",
  "name": "John Doe"
}
```

**Response (200):**
```json
{
  "token": "tok_gw_abc123"
}
```

#### `POST /api/payments/charge`

**Request body:**
```json
{
  "token": "tok_gw_abc123",
  "productId": "uuid",
  "quantity": 1,
  "idempotencyKey": "abc-123-def",
  "cardLastFour": "1111",
  "cardholderName": "John Doe",
  "totalAmount": 99999
}
```

**Response (200):**
```json
{
  "transaction": {
    "id": "uuid",
    "status": "COMPLETED",
    "amount": 99999,
    "productId": "uuid",
    "quantity": 1,
    "cardLastFour": "1111",
    "cardholderName": "John Doe",
    "createdAt": "2026-07-10T..."
  },
  "isDuplicate": false
}
```

**Error responses:**
- `400` — Missing required fields
- `409` — Insufficient stock (body: `{ "statusCode": 409, "message": "Insufficient stock" }`)
- `404` — Transaction not found
- `500` — Payment processing failed

#### `GET /api/payments/:id`

**Response (200):**
```json
{
  "transaction": {
    "id": "uuid",
    "status": "COMPLETED",
    "amount": 99999,
    "productId": "uuid",
    "quantity": 1,
    "cardLastFour": "1111",
    "cardholderName": "John Doe",
    "createdAt": "2026-07-10T..."
  }
}
```

**Transaction statuses:** `PENDING` → `PROCESSING` → `COMPLETED` / `FAILED` / `RETRIES_EXHAUSTED`

## Testing

All suites run green: **backend — 106 tests across 14 suites** and **mobile — 152 tests across 17 suites**.

### Backend Tests (106 unit tests)

```bash
cd backend
npm run test:cov
```

**Coverage (measured 2026-07-11):**
| Metric | % | Threshold |
|--------|---|-----------|
| Statements | 99.62% | ≥80% |
| Branches | 94.93% | ≥80% |
| Functions | 97.72% | ≥80% |
| Lines | 99.56% | ≥80% |

### Mobile Tests (152 unit tests)

```bash
cd mobile
npx jest --coverage
```

**Coverage (measured 2026-07-11):**
| Metric | % | Threshold |
|--------|---|-----------|
| Statements | 95.33% | ≥80% |
| Branches | 81.66% | ≥80% |
| Functions | 93.02% | ≥80% |
| Lines | 95.46% | ≥80% |

### Total Coverage Summary

| Layer | Suites | Tests | Statements | Branches | Functions | Lines |
|-------|--------|-------|------------|----------|-----------|--------|
| Backend | 14 | 106 | 99.62% | 94.93% | 97.72% | 99.56% |
| Mobile | 17 | 152 | 95.33% | 81.66% | 93.02% | 95.46% |

## APK (Android build)

A debug Android build is committed in-repo at `mobile/release/app-debug.apk` (~151 MB) so the
artifact is available per the coding-test brief (this environment has no Android SDK, so the
APK could not be rebuilt from source here).

- **What it is:** the `assembleDebug` output of the React Native Android app (a debug APK).
- **How to regenerate:** on a machine with the Android SDK installed and `ANDROID_HOME` set, run:
  ```bash
  cd mobile/android && ./gradlew assembleDebug
  ```
  The output lands at `mobile/android/app/build/outputs/apk/debug/app-debug.apk`.
- **Honesty note — stale baseline:** the committed APK reflects the **encrypted-persistence +
  audit-fix baseline**. It does **not** yet include the latest UI work (Backdrop component,
  payment-error Toast, and the env-driven backend URL). To ship those changes, rebuild on a
  machine with the Android SDK using the command above; do not treat this APK as current.
- **Encrypted persistence:** persisted state (cart, checkout, transactions slices) uses
  `react-native-encrypted-storage` via `redux-persist` — OS-backed Keychain/Keystore
  encryption, not plaintext. Raw card numbers are never persisted.

## Development

### Key Design Decisions

- **Hexagonal architecture** in backend: domain layer has zero Nest.js imports — pure TypeScript. Swapping infrastructure (DB, gateway) requires zero domain changes.
- **Payment gateway abstraction**: Gateway referenced only via `IPaymentGateway` interface. Gateway name is strictly limited to environment configuration — zero occurrences in source code.
- **Client-side validation**: Luhn checksum, brand detection (Visa/MasterCard), expiry date validation run on-device before any API call.
- **Idempotency**: Payment submissions use idempotency keys to prevent duplicate charges. Duplicate requests return the existing transaction without calling the gateway.
- **Retry with backoff**: Gateway network failures trigger up to 3 retries with exponential backoff (1s, 2s, 4s).
- **Encrypted persistence**: `redux-persist` uses `react-native-encrypted-storage` (an OS-backed encrypted store — Keychain/Keystore) as its storage engine for the cart, checkout, and transactions slices. This is real device-level encryption, **not** base64 obfuscation or a plaintext-safe copy. Raw card numbers are never persisted — only tokenized data is stored.

### Architecture Patterns

- **Backend**: Nest.js modules with 3-layer structure (domain → application → infrastructure)
- **Mobile**: Redux Toolkit for state management, React Navigation for screen flow
- **Security**: Card data tokenized before storage, encrypted persistence, no gateway name in source

### Environment Variables

#### Backend (`backend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `development` | Environment |
| `GATEWAY_URL` | `https://sandbox-gateway.example.com` | Payment gateway base URL |
| `GATEWAY_API_KEY` | `sandbox-key` | Gateway API key |

#### Mobile (`mobile/.env`)

| Variable | Description |
|----------|-------------|
| `API_URL` | Backend API base URL (e.g., `http://localhost:3000/api`) — injected at build time by `react-native-dotenv` |

#### Sandbox / Payment Gateway setup

The backend talks to the payment gateway **only** through the `IPaymentGateway`
interface and environment configuration. The gateway's brand name appears
**nowhere in the source code** — it lives solely in your gitignored `backend/.env`.

| Variable | Default | Description |
|----------|---------|-------------|
| `GATEWAY_URL` | `https://sandbox-gateway.example.com` | Gateway base URL |
| `GATEWAY_API_KEY` | `sandbox-key` | Gateway API key (sent as `Authorization: Bearer`) |
| `GATEWAY_MODE` | `simulate` | `simulate` → canned local responses (no network); `live` → real HTTP calls |

To use the **real sandbox** instead of the built-in simulator:

1. Set `GATEWAY_URL` to the sandbox base URL (e.g. `https://sandbox.example-payments.com`).
2. Set `GATEWAY_API_KEY` to your sandbox API key.
3. Set `GATEWAY_MODE=live`.

> Note: the sandbox URL is a real third-party endpoint and is intentionally kept
> out of the repository. The codebase contains **no literal "Wompi"** (or other
> gateway brand) string — only the abstracted `IPaymentGateway` interface and the
> environment variables listed above.

## Pull Requests (Feature Branch Chain)

This project was developed across a chain of PRs:

| PR | Branch | Scope |
|----|--------|-------|
| [PR 1](https://github.com/jhormanorozco/Prueba-Wompi/pull/1) | `feat/backend-core` | Nest.js backend: products + payments modules, hexagonal architecture |
| [PR 2](https://github.com/jhormanorozco/Prueba-Wompi/pull/2) | `feat/mobile-core` | React Native: 7 screens, Redux, navigation, card validation |
| [PR 3](https://github.com/jhormanorozco/Prueba-Wompi/pull/3) | `feat/integration-polish` | Integration: API wiring, Dockerfile, .env examples, README, test verification |
| [PR 7](https://github.com/jhormanorozco/Prueba-Wompi/pull/7) | `feat/audit-fix-implementation` | Applies audit-fix findings: honest README/test numbers, env-driven mobile URL, payment-error toast, responsive hardening |

Branch chain: `main` ← `dev` (tracker) ← `feat/backend-core` ← `feat/mobile-core` ← `feat/integration-polish` ← `feat/audit-fix-implementation`
