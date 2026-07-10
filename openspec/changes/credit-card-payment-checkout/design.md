# Design: Credit Card Payment Checkout

## Technical Approach

Monorepo with `mobile/` (React Native + Redux) and `backend/` (Nest.js + hexagonal architecture). Mobile handles 7-screen flow, client-side card validation, and encrypted persistence. Backend implements a payment pipeline: tokenize → charge → update stock. Gateway abstracted behind an interface — gateway name limited to config/env only.

## Architecture Decisions

### Monorepo Structure

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Single flat repo | Simple; shared config easier | **Chosen**. No CI/CD yet; avoids multi-repo overhead |
| Turborepo/Nx workspaces | Adds tooling complexity | Rejected — overkill for greenfield |

Layout: `mobile/` and `backend/` at root. Shared config (TS strict, lint) duplicated per package — YAGNI to extract shared configs until needed.

### React Native Structure

| Layer | Layout | Rationale |
|-------|--------|-----------|
| Screens | `screens/SplashScreen.tsx`, `HomeScreen.tsx`, `SelectProductScreen.tsx`, `CheckoutScreen.tsx`, `CardInfoScreen.tsx`, `PaymentSummaryScreen.tsx`, `TransactionStatusScreen.tsx` | One file per screen; matches 7-screen flow 1:1 |
| Components | `components/ProductCard.tsx`, `components/CartItem.tsx`, `components/CardInput.tsx`, `components/PriceTag.tsx` | Reusable across screens |
| Store | `store/slices/productsSlice.ts`, `cartSlice.ts`, `checkoutSlice.ts`, `transactionsSlice.ts` | One slice per domain concern |
| Services | `services/api.ts`, `services/encryption.ts`, `services/cardDetection.ts` | Infrastructure concerns isolated |

### Nest.js Hexagonal Modules

Each capability maps to a module with three layers:

```
modules/products/           modules/payments/
├── domain/                 ├── domain/
│   ├── product.entity.ts   │   ├── transaction.entity.ts
│   └── product.repository.ts│  ├── transaction-status.enum.ts
├── application/            │   └── payment-gateway.interface.ts
│   └── get-products.usecase.ts├── application/
└── infrastructure/         │   ├── process-payment.usecase.ts
    ├── products.controller.ts│  └── tokenize-card.usecase.ts
    └── product.repository.ts└── infrastructure/
        (TypeORM impl)          ├── payments.controller.ts
                                ├── sandbox-payment-gateway.ts
                                └── transaction.repository.ts
```

**Why**: Domain layer has zero Nest.js imports — pure TS. Swapping infrastructure (DB, gateway) requires zero domain changes.

### Redux Store Shape

| Slice | Key State | Persisted? |
|-------|-----------|------------|
| `products` | `items[]`, `loading`, `error` | No (fetched fresh) |
| `cart` | `items[{productId, quantity}]` | Yes (encrypted) |
| `checkout` | `step`, `cardInfo`, `token`, `transactionId` | Yes (encrypted) |
| `transactions` | `history[]`, `lastTransaction` | Yes (encrypted) |

Encrypted persistence via `redux-persist` + `react-native-encrypted-storage`. Only cart/checkout/transactions slices encrypted — products slice is ephemeral.

### Payment Gateway Abstraction

```
IPaymentGateway (domain layer, no Nest.js deps)
├── tokenize(cardDetails): Promise<TokenResponse>
├── charge(token, amount, idempotencyKey): Promise<ChargeResponse>
└── getStatus(gatewayRef): Promise<TransactionStatus>

SandboxPaymentGateway (infrastructure, implements IPaymentGateway)
├── Reads gateway URL from ConfigService
├── Retry: 3 attempts, exponential backoff (1s, 2s, 4s)
└── Gateway name NEVER in source — only in .env
```

Registered via Nest.js DI with `@Inject(IPaymentGateway)` token. Tests inject a mock.

### Encryption Strategy

`redux-persist` transformer checks slice key: if `cart`, `checkout`, or `transactions` → encrypt value with `react-native-encrypted-storage` before writing. On read, decrypt transparently. Raw card details exist only in-memory on the `checkout` slice — cleared after tokenization response.

### API Contracts

| Endpoint | Method | Body | Response |
|----------|--------|------|----------|
| `/api/products` | GET | — | `Product[]` |
| `/api/payments/tokenize` | POST | `{number, expiry, cvc, name}` | `{token}` |
| `/api/payments/charge` | POST | `{token, productId, quantity, idempotencyKey}` | `{transaction}` |
| `/api/payments/:id` | GET | — | `{transaction}` |

## Data Flow

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Mobile App   │     │  Nest.js Backend │     │ Payment Gateway │
│  (RN + Redux) │     │  (Hexagonal)     │     │  (Sandbox)      │
└──────┬───────┘     └────────┬─────────┘     └────────┬────────┘
       │                      │                         │
       │  GET /api/products   │                         │
       │─────────────────────>│                         │
       │<── Product[] ────────│                         │
       │                      │                         │
       │  POST /tokenize      │                         │
       │  {card details}      │                         │
       │─────────────────────>│                         │
       │                      │  tokenize(card)         │
       │                      │────────────────────────>│
       │                      │<─── { token } ──────────│
       │<── { token } ────────│                         │
       │                      │                         │
       │  POST /charge        │                         │
       │  {token, cart}       │                         │
       │─────────────────────>│                         │
       │                      │  validate stock ───┐    │
       │                      │  (stock ok?       │    │
       │                      │   else → 409)     │    │
       │                      │<───────────────────┘    │
       │                      │                         │
       │                      │  charge(token, amt)     │
       │                      │────────────────────────>│
       │                      │<── { status, ref } ─────│
       │                      │                         │
       │                      │  update product stock ──┐│
       │<── { transaction } ──│<────────────────────────┘│
       │                      │                         │
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `mobile/package.json` | Create | React Native deps + scripts |
| `mobile/App.tsx` | Create | Root component, store provider, navigation |
| `mobile/src/navigation/AppNavigator.tsx` | Create | Stack navigator (7 screens) |
| `mobile/src/screens/*Screen.tsx` (7 files) | Create | One per flow step |
| `mobile/src/components/ProductCard.tsx` | Create | Product list item |
| `mobile/src/components/CardInput.tsx` | Create | Card form with brand detection |
| `mobile/src/components/PriceTag.tsx` | Create | Currency formatting |
| `mobile/src/store/store.ts` | Create | Redux store config |
| `mobile/src/store/slices/productsSlice.ts` | Create | Product state + async thunk |
| `mobile/src/store/slices/cartSlice.ts` | Create | Cart state + add/remove/update |
| `mobile/src/store/slices/checkoutSlice.ts` | Create | Checkout step + card info |
| `mobile/src/store/slices/transactionsSlice.ts` | Create | Transaction history |
| `mobile/src/services/api.ts` | Create | Axios client, endpoint wrappers |
| `mobile/src/services/encryption.ts` | Create | redux-persist encrypt transformer |
| `mobile/src/services/cardDetection.ts` | Create | Luhn check + brand regex |
| `backend/package.json` | Create | Nest.js deps + scripts |
| `backend/src/main.ts` | Create | Nest app bootstrap |
| `backend/src/config/env.config.ts` | Create | Gateway URL, env vars |
| `backend/src/modules/products/domain/product.entity.ts` | Create | Product entity |
| `backend/src/modules/products/application/get-products.usecase.ts` | Create | List products use case |
| `backend/src/modules/products/infrastructure/products.controller.ts` | Create | GET /api/products |
| `backend/src/modules/products/infrastructure/product.repository.ts` | Create | In-memory/TypeORM repo |
| `backend/src/modules/payments/domain/transaction.entity.ts` | Create | Transaction entity |
| `backend/src/modules/payments/domain/transaction-status.enum.ts` | Create | PENDING→PROCESSING→COMPLETED/FAILED |
| `backend/src/modules/payments/domain/payment-gateway.interface.ts` | Create | Gateway abstraction |
| `backend/src/modules/payments/application/process-payment.usecase.ts` | Create | Full pipeline orchestrator |
| `backend/src/modules/payments/application/tokenize-card.usecase.ts` | Create | Card → token flow |
| `backend/src/modules/payments/infrastructure/sandbox-payment-gateway.ts` | Create | Sandbox impl + retry |
| `backend/src/modules/payments/infrastructure/payments.controller.ts` | Create | POST /tokenize, POST /charge |
| `backend/Dockerfile` | Create | Node 20, build, start |

## Interfaces / Contracts

```typescript
// Domain — Payment Gateway Interface (backend)
interface IPaymentGateway {
  tokenize(details: CardDetails): Promise<TokenResponse>;
  charge(token: string, amount: number, idempotencyKey: string): Promise<ChargeResponse>;
  getStatus(gatewayRef: string): Promise<TransactionStatus>;
}

interface CardDetails {
  number: string;    // never stored after tokenize
  expiry: string;    // MM/YY
  cvc: string;
  cardholderName: string;
}

type TransactionStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'RETRIES_EXHAUSTED';

// Mobile — Redux Slice Types
interface Product { id: string; name: string; description: string; price: number; imageUrl: string; stock: number; }
interface CartItem { productId: string; quantity: number; }
interface CheckoutState { step: number; cardInfo?: CardDetails; token?: string; transactionId?: string; }
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit (mobile) | Card validation, brand detection, Luhn | Pure function tests, no mocks |
| Unit (mobile) | Redux reducers + actions | Test each slice action → state transition |
| Unit (backend) | Use cases (process-payment, tokenize) | Mock gateway, test pipeline logic |
| Unit (backend) | Payment gateway interface | Mock server, test retry/backoff |
| Unit (backend) | Stock validation | Test insufficient stock → 409 |
| Integration (backend) | Full charge flow | In-memory DB + mock gateway |
| E2E (mobile) | 7-screen navigation | React Native Testing Library |

## Migration / Rollout

No migration required. Greenfield project. Seed data loaded on backend startup via `@nestjs/typeorm` synchronize or in-memory array. No data to migrate.

## Open Questions

- [ ] Confirm if in-memory storage suffices or SQLite (TypeORM) is preferred for backend
- [ ] Confirm sandbox gateway credentials source (`.env` values to be provided)
- [ ] Confirm React Navigation version (v6 or v7) for stack navigator
