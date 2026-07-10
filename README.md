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
| Mobile Framework | React Native 0.73.4 | Cross-platform mobile app |
| State Management | Redux Toolkit + redux-persist | Global state + encrypted persistence |
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
cp ../.env.example .env
# Or create mobile/.env with:
# API_URL=http://localhost:3000/api
npx react-native start
```

In another terminal:
```bash
cd mobile
npx react-native run-android  # or npx react-native run-ios
```

> **Note**: The mobile app expects the backend to be running at `API_URL`. Update `mobile/.env` if running on a physical device (use your machine's IP instead of `localhost`).

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

### Backend Tests (80 unit tests)

```bash
cd backend
npx jest --coverage
```

**Coverage:**
| Metric | % | Threshold |
|--------|---|-----------|
| Statements | 95.63% | ≥80% |
| Branches | 80.32% | ≥80% |
| Functions | 97.36% | ≥80% |
| Lines | 96.42% | ≥80% |

### Mobile Tests (120 unit tests)

```bash
cd mobile
npx jest --coverage
```

**Coverage:**
| Metric | % | Threshold |
|--------|---|-----------|
| Statements | 98.71% | ≥80% |
| Branches | 90.18% | ≥80% |
| Functions | 96.73% | ≥80% |
| Lines | 98.95% | ≥80% |

### Total Coverage Summary

| Layer | Suites | Tests | Statements | Branches | Functions | Lines |
|-------|--------|-------|------------|----------|-----------|--------|
| Backend | 13 | 80 | 95.63% | 80.32% | 97.36% | 96.42% |
| Mobile | 13 | 120 | 98.71% | 90.18% | 96.73% | 98.95% |

## Development

### Key Design Decisions

- **Hexagonal architecture** in backend: domain layer has zero Nest.js imports — pure TypeScript. Swapping infrastructure (DB, gateway) requires zero domain changes.
- **Payment gateway abstraction**: Gateway referenced only via `IPaymentGateway` interface. Gateway name is strictly limited to environment configuration — zero occurrences in source code.
- **Client-side validation**: Luhn checksum, brand detection (Visa/MasterCard), expiry date validation run on-device before any API call.
- **Idempotency**: Payment submissions use idempotency keys to prevent duplicate charges. Duplicate requests return the existing transaction without calling the gateway.
- **Retry with backoff**: Gateway network failures trigger up to 3 retries with exponential backoff (1s, 2s, 4s).
- **Encrypted persistence**: `redux-persist` + `react-native-encrypted-storage` for cart, checkout, and transaction slices. Raw card numbers never stored after tokenization.

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
| `API_URL` | Backend API base URL (e.g., `http://localhost:3000/api`) |

## Pull Requests (Feature Branch Chain)

This project was developed across 3 chained PRs:

| PR | Branch | Scope |
|----|--------|-------|
| [PR 1](https://github.com/jhormanorozco/Prueba-Wompi/pull/1) | `feat/backend-core` | Nest.js backend: products + payments modules, hexagonal architecture |
| [PR 2](https://github.com/jhormanorozco/Prueba-Wompi/pull/2) | `feat/mobile-core` | React Native: 7 screens, Redux, navigation, card validation |
| [PR 3](https://github.com/jhormanorozco/Prueba-Wompi/pull/3) | `feat/integration-polish` | Integration: API wiring, Dockerfile, .env examples, README, test verification |

Branch chain: `main` ← `dev` (tracker) ← `feat/backend-core` ← `feat/mobile-core` ← `feat/integration-polish`
