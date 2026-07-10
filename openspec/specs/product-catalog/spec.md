# Product Catalog Specification

## Purpose

Define the product listing, selection, and cart management capabilities across the backend API and mobile app. Backend serves seed data; mobile displays and manages the user's product selection.

## Requirements

### Requirement: Product Data — Backend GET Endpoint (Backend)

The backend MUST expose a `GET /api/products` endpoint returning a list of products. Each product MUST have: id, name, description, price (in cents), imageUrl, and stock quantity. Data SHALL be served from a seed dataset.

#### Scenario: Successful product fetch

- GIVEN the backend is running
- WHEN a client sends `GET /api/products`
- THEN the response SHALL have status 200
- AND the body SHALL contain an array of products with all required fields

#### Scenario: Empty catalog

- GIVEN the seed data is empty
- WHEN a client sends `GET /api/products`
- THEN the response SHALL return status 200 with an empty array

### Requirement: Product Stock Management — After Payment (Backend)

After a successful payment, the backend MUST decrement each purchased product's stock by the ordered quantity. The product SHALL be assigned to the transaction record.

#### Scenario: Stock decrement after payment

- GIVEN a product with stock=10
- WHEN a payment succeeds for quantity=3
- THEN the product stock MUST be 7
- AND the transaction SHALL reference the product id and quantity

#### Scenario: Insufficient stock edge case

- GIVEN a product with stock=1
- WHEN a payment is processed for quantity=2
- THEN the backend MUST reject the transaction before calling the gateway
- AND return a 409 Conflict response with "Insufficient stock"

### Requirement: Product List Screen (Mobile)

The mobile app SHALL render a scrollable product list showing product name, price, and image. Each item MUST be tappable to select and set quantity.

#### Scenario: Product list loads

- GIVEN the mobile app is on the Home screen
- WHEN the products API returns data
- THEN each product SHALL display name, formatted price, and image
- AND tapping a product SHALL open the quantity selector

#### Scenario: Loading state

- GIVEN the product API request is pending
- WHEN the Home screen renders
- THEN a loading indicator SHALL be displayed
- AND no products SHALL be shown until the response arrives

### Requirement: Cart Management (Mobile)

The mobile app SHALL maintain a Redux cart slice storing selected products with quantities. The user MUST be able to add items, update quantities, or remove items before checkout.

#### Scenario: Add item to cart

- GIVEN a product with quantity=2 is selected
- WHEN the user confirms the selection
- THEN the cart SHALL contain the product with quantity=2
- AND the cart item count badge SHALL display "2"

#### Scenario: Remove item from cart

- GIVEN the cart contains a product with quantity=1
- WHEN the user sets quantity to 0
- THEN the item SHALL be removed from the cart
