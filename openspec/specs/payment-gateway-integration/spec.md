# Payment Gateway Integration Specification

## Purpose

Define the backend payment pipeline that integrates with the sandbox payment gateway (abstracted as "payment-gateway") — covering tokenization, transaction lifecycle, error handling, and idempotency. Gateway references MUST be limited to config/environment only (no gateway name in source code).

## Requirements

### Requirement: Gateway Abstraction (Backend)

The backend MUST reference the payment gateway exclusively through a config module or environment variables. The word "Wompi" SHALL NOT appear in source code, comments, or repo metadata.

#### Scenario: Zero gateway name in source

- GIVEN the repository is scanned for "Wompi" (case-insensitive)
- WHEN checking all `.ts`, `.json`, `.yaml`, `.md` files
- THEN the search SHALL return zero matches outside of `.env` / config files

### Requirement: Transaction Lifecycle (Backend)

The backend MUST process payments in a strict pipeline: create PENDING transaction → tokenize card → process payment via gateway → update result → assign product → update stock. Each stage SHALL persist to the database.

#### Scenario: Successful payment pipeline

- GIVEN a valid card token and cart payload
- WHEN the payment pipeline executes
- THEN the transaction SHALL transition PENDING → PROCESSING → COMPLETED
- AND product stock SHALL be decremented
- AND the gateway SHALL receive exactly one charge request

#### Scenario: Gateway rejects payment

- GIVEN the gateway returns a decline (e.g., insufficient funds)
- WHEN the payment pipeline processes the response
- THEN the transaction SHALL transition to FAILED with the gateway's error code
- AND stock SHALL NOT be decremented
- AND the mobile app SHALL display a descriptive toast error

### Requirement: Idempotent Payment Submission (Backend, Integration)

Payment submissions MUST be idempotent. The backend SHALL use an idempotency key (derived from cart hash + timestamp) to reject duplicate gateway calls.

#### Scenario: Duplicate submission prevented

- GIVEN a transaction with idempotency key "abc-123"
- WHEN a second request with the same key arrives
- THEN the backend SHALL return the existing transaction result
- AND the gateway SHALL NOT be called again

### Requirement: Tokenization Endpoint (Backend, Integration)

The backend MUST expose `POST /api/payments/tokenize` that accepts card details and returns a token from the gateway. Card details SHALL NOT be stored after tokenization.

#### Scenario: Successful tokenization

- GIVEN valid card details (number, expiry, cvc)
- WHEN `POST /api/payments/tokenize` is called
- THEN a gateway token SHALL be returned
- AND the raw card number SHALL NOT be stored in the database

### Requirement: Retry with Backoff (Backend)

Gateway network failures SHALL trigger up to 3 retries with exponential backoff. If all retries fail, the transaction SHALL enter RETRIES_EXHAUSTED status.

#### Scenario: Transient gateway failure recovers

- GIVEN the gateway returns a 503 on the first attempt
- WHEN the retry mechanism fires
- THEN the backend SHALL retry after an exponential delay (1s, 2s, 4s)
- AND if the third attempt succeeds, the transaction SHALL continue normally

#### Scenario: All retries fail

- GIVEN the gateway returns 503 for all 3 attempts
- WHEN the retry budget is exhausted
- THEN the transaction SHALL enter RETRIES_EXHAUSTED status
- AND the mobile app SHALL display "Payment service unavailable. Try again."
