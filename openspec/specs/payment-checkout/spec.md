# Payment Checkout Specification

## Purpose

Define the complete 7-screen credit card checkout flow for the mobile app, including Redux state management, encrypted persistence, and crash resilience. All scenarios apply to the **mobile** layer.

## Requirements

### Requirement: 7-Screen Navigation Flow (Mobile)

The mobile app MUST render seven ordered screens: Splash → Home → Select Product → Checkout → Credit Card Info → Payment Summary → Transaction Status. The user MUST be able to advance sequentially and return to Home after completion.

#### Scenario: Happy path — full flow completes

- GIVEN the app launches
- WHEN the user navigates through all 7 screens in order
- THEN each screen renders without error
- AND the final Transaction Status screen shows success
- AND a "Go Home" action returns to the Home screen

#### Scenario: Back navigation during Checkout

- GIVEN the user is on the Credit Card Info screen
- WHEN the user taps the back action
- THEN the Checkout screen is displayed with cart state preserved

### Requirement: Credit Card Input & Brand Detection (Mobile)

The Credit Card Info screen SHALL accept card number, expiry, CVC, and cardholder name. The system MUST detect Visa (starts with 4) and MasterCard (starts with 51–55) and display the corresponding logo.

#### Scenario: Visa detected

- GIVEN the user enters a card number starting with "4"
- WHEN the input reaches 4 digits
- THEN a Visa logo MUST appear next to the card number field

#### Scenario: Unknown brand

- GIVEN the user enters a card number starting with "3"
- WHEN the input reaches 4 digits
- THEN no brand logo is displayed
- AND input proceeds normally with standard validation

### Requirement: Client-Side Card Validation (Mobile)

The Credit Card Info screen MUST validate: Luhn checksum (card number), valid future date (expiry), 3–4 digit CVC. Invalid inputs SHALL show inline error messages.

#### Scenario: Invalid card number

- GIVEN the card number field has value "1234 5678 9012 3456"
- WHEN the user taps "Continue"
- THEN an inline error message SHALL state "Invalid card number"

#### Scenario: Expired card

- GIVEN the expiry date is in the past
- WHEN validation runs
- THEN an inline error SHALL state "Card expired"

### Requirement: Encrypted State Persistence (Mobile)

Redux state SHALL persist via `redux-persist` with `react-native-encrypted-storage` for transaction-related slices. On app restart, the persisted checkout state SHALL be restored from encrypted storage.

#### Scenario: Crash recovery

- GIVEN the user completed card entry
- WHEN the app crashes before the Payment Summary screen
- THEN on relaunch, persisted state restores to the last safe checkpoint
- AND the user can continue from the Checkout screen

### Requirement: Responsive Layout (Mobile)

All screens SHALL render correctly at 1334×750 (iPhone SE 2020 minimum). Content SHALL be scrollable and not clipped.

#### Scenario: iPhone SE resolution

- GIVEN a 1334×750 viewport
- WHEN any checkout screen renders
- THEN all interactive elements fit without horizontal scroll
- AND vertical scroll is available where content overflows
