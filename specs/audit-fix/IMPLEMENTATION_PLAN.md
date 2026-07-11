# Plan de Implementación — Corrección de Auditoría

> Basado en: `specs/audit-fix/SPEC.md`  
> 25 issues agrupados en 5 fases  
> **Estimación total**: ~12-15 horas de desarrollo efectivo

---

## Diagrama de Dependencias

```
F1: Bloqueantes ─────────────────────────────────────────┐
  B1 (items array) ──── depende de ── A1 (total server)  │
  B2 (clearCardInfo) ── independiente                     │
  B3 (stock race) ──── independiente (backend only)       │
                                                          │
F2: PCI DSS ──────────────────────────────────────────────┤
  P1 (CVV persist) ──── depende de ── P3 (PAN Redux)     │
  P2 (HTTP→HTTPS) ──── independiente                      │
  P3 (PAN completo) ── depende de ── A2 (payment service) │
                                                          │
F3: Arquitectura ────────────────────────────────────────┤
  A1 (total server) ── depende de ── B1 (items array)    │
  A2 (payment service) ── depende de ── A3 (api client)   │
  A3 (api client) ──── independiente                      │
  A4 (CORS) ───────── independiente (backend only)        │
  A5 (idempotency) ── independiente                       │
                                                          │
F4: Calidad ─────────────────────────────────────────────┤
  M1 (tipado) ──────── independiente (mecánico)           │
  M2 (fetchProducts) ── independiente                     │
  M3 (selectors) ──── independiente                       │
  M4 (transforms) ──── independiente                      │
  M5 (boxShadow) ──── independiente                       │
  M6 (gap) ────────── independiente                       │
  M7 (brands) ─────── independiente                       │
  M8 (getBrandLogo) ── independiente                      │
  M9 (CVC) ────────── independiente                       │
                                                          │
F5: UX ──────────────────────────────────────────────────┘
  m1 (pull-to-refresh) ── independiente
  m2 (loading states) ─── independiente
  m3 (image cache) ────── independiente
  m4 (logging) ────────── independiente (relacionado A3)
  m5 (import) ─────────── independiente
```

---

## Fase 1: Issues Bloqueantes (5-6h)

### Prioridad: MÁXIMA — Sin estos fixes la app pierde dinero

#### Paso 1.1 — [B2] Fix `clearCardInfo` race (0.5h)

**Archivos**: `src/screens/PaymentSummaryScreen.tsx`

**Cambios**:
1. Mover `dispatch(clearCardInfo())` a después de las líneas que leen `checkout.cardInfo`
2. Capturar `cardLastFour` y `cardholderName` en variables locales ANTES de cualquier dispatch
3. Usar variables locales en `chargePayment` en lugar de `checkout.cardInfo`

```typescript
// ANTES (roto):
dispatch(clearCardInfo());
const cardLastFour = (checkout.cardInfo?.number ?? '').slice(-4);
//                 ^ check.cardInfo YA FUE LIMPIADO

// DESPUÉS (correcto):
const cardLastFour = (checkout.cardInfo?.number ?? '').slice(-4);
const cardholderName = checkout.cardInfo?.cardholderName ?? '';
// ... usar variables locales ...
dispatch(clearCardInfo()); // <-- mover aquí
```

**Verificación**: `npm test` pasa, flujo de pago envía datos correctos.

---

#### Paso 1.2 — [B1] Array de items en lugar de `firstItem` (2-3h)

**Archivos**: `src/services/api.ts`, `src/screens/PaymentSummaryScreen.tsx`, `backend/.../payments.controller.ts`, `backend/.../process-payment.usecase.ts`, `backend/.../transaction.entity.ts`

**Cambios**:

**Frontend** (`api.ts`):
```typescript
export interface ChargeRequest {
  token: string;
  items: Array<{ productId: string; quantity: number }>;
  idempotencyKey: string;
  cardLastFour: string;
  cardholderName: string;
}
```

**Frontend** (`PaymentSummaryScreen.tsx`):
```typescript
// En lugar de:
const firstItem = cartItems[0];
// Usar:
const items = cartItems.map(item => ({
  productId: item.productId,
  quantity: item.quantity,
}));
```

**Backend** (`process-payment.usecase.ts`):
- Cambiar `ProcessPaymentInput` para recibir `items: ItemInput[]`
- Iterar items para verificar stock individual
- Descontar stock de cada producto en loop (cada uno con `atomicDecrementStock`)
- Calcular `totalAmount` server-side como sumatoria

**Backend** (`payments.controller.ts`):
- Actualizar DTO de charge para aceptar array de items

**Verificación**:
- Test: carrito con 3 productos → backend recibe 3 items
- Test: stock se descuenta correctamente para cada producto
- Test: si un producto no tiene stock, toda la transacción se rechaza

---

#### Paso 1.3 — [B3] Atomic stock decrement (2h)

**Archivos**: `backend/.../product.repository.ts`, `backend/.../process-payment.usecase.ts`

**Cambios**:

En `product.repository.ts`:
```typescript
async atomicDecrementStock(id: string, quantity: number): Promise<boolean> {
  const result = await this.dataSource
    .createQueryBuilder()
    .update(ProductEntity)
    .set({ stock: () => `stock - :quantity` })
    .where('id = :id AND stock >= :quantity', { id, quantity })
    .execute();
  return (result.affected ?? 0) > 0;
}
```

En `process-payment.usecase.ts`:
```typescript
const stockOk = await this.productRepository.atomicDecrementStock(item.productId, item.quantity);
if (!stockOk) {
  // Rollback: restaurar stock de productos ya descontados en este batch
  throw new InsufficientStockError(item.productId, 0, item.quantity);
}
```

**Verificación**:
- Test de concurrencia: 10 requests paralelos, stock=5 → solo 5 success
- No hay stock negativo

---

## Fase 2: PCI DSS (3-4h)

### Prioridad: ALTA — Riesgo regulatorio

#### Paso 2.1 — [P1] + [P3] CVV y PAN fuera de Redux (2h)

**Archivos**: `src/store/slices/checkoutSlice.ts`, `src/screens/CardInfoScreen.tsx`, `src/screens/PaymentSummaryScreen.tsx`, `src/store/store.ts`

**Cambios**:

1. En `checkoutSlice.ts`, cambiar `CardInfo` interface:
```typescript
export interface CardInfo {
  lastFour: string;
  brand: CardBrand;
  cardholderName: string;
}
```

2. En `CardInfoScreen.tsx`:
   - Mantener `number` y `cvc` en `useState` LOCAL
   - Al dispatch `setCardInfo`, enviar solo `lastFour`, `brand`, `cardholderName`
   - Pasar `number` y `cvc` a `PaymentSummaryScreen` via `route.params`

3. En `PaymentSummaryScreen.tsx`:
   - Recibir `number` y `cvc` de `route.params` (no de Redux)
   - Usar valores de params para tokenizar
   - Limpiar params después de usar (navegar con `{...params, cvc: undefined}`)

4. En `store.ts`, agregar `stripCvcTransform` si quedó algún residuo.

**Verificación**:
- Redux DevTools: NO muestra número completo ni CVC
- Flujo de pago funciona: CardInfo → PaymentSummary → charge exitoso
- Tests de integración del flujo

---

#### Paso 2.2 — [P2] HTTP → HTTPS configurable (1h)

**Archivos**: `src/config/api.ts`, `src/services/api.ts`

**Cambios**:

```typescript
// api.ts
const API_PROTOCOL = (() => {
  if (__DEV__ && API_HOST === '127.0.0.1') return 'http';
  return 'https';
})();
export const API_BASE_URL = `${API_PROTOCOL}://${API_HOST}:${API_PORT}/api`;
```

Agregar interceptor de advertencia:
```typescript
// api.ts en createApiClient
if (__DEV__ && baseURL.startsWith('http://') && !baseURL.includes('localhost') && !baseURL.includes('127.0.0.1')) {
  console.warn('[PCI] Sending sensitive data over HTTP to non-local host!');
}
```

**Verificación**:
- En desarrollo local: HTTP funciona
- En producción si se configura: HTTPS forzado

---

## Fase 3: Arquitectura (4-5h)

### Prioridad: MEDIA — Deuda técnica significativa

#### Paso 3.1 — [A3] API Client singleton (1h)

**Archivos**: `src/services/apiClient.ts` (NUEVO), `src/services/api.ts`

**Cambios**:
1. Crear `apiClient.ts` con singleton Axios instance
2. Interceptor de logging y error handling
3. Actualizar `createApiClient` para usar el singleton
4. Actualizar screens para no llamar `createApiClient` directamente

**Verificación**:
- Tests con mock del singleton (reseteable)
- Logging en dev visible

---

#### Paso 3.2 — [A2] Payment Service (2h)

**Archivos**: `src/services/paymentService.ts` (NUEVO), `src/screens/PaymentSummaryScreen.tsx`

**Cambios**:
1. Crear `paymentService.ts` con `processPayment(input)` exportable
2. Extraer toda la lógica de `handlePay` al service
3. En `PaymentSummaryScreen.tsx`, reducir a llamada simple
4. Tests unitarios para `processPayment` con mocks

**Dependencia**: Requiere [A3] para API client singleton

**Verificación**:
- Test unitario: `processPayment` con mocks
- Test de integración: flujo completo funciona
- 85%+ coverage en nuevo service

---

#### Paso 3.3 — [A1] Total server-side (1h)

**Archivos**: `backend/.../process-payment.usecase.ts`

**Dependencia**: Requiere [B1] (items array)

**Cambios**:
1. Eliminar `totalAmount` del input
2. Calcular sumando `product.price * item.quantity` para cada item
3. Devolver `totalAmount` en la respuesta

**Verificación**:
- Test: cliente envía total manipulado → backend lo ignora y recalcula
- El monto final coincide con precios actuales del producto

---

#### Paso 3.4 — [A4] CORS configurable (0.5h)

**Archivo**: `backend/src/main.ts`

**Cambios**:
```typescript
const corsOrigins = process.env.CORS_ORIGINS?.split(',') ?? ['*'];
app.enableCors({
  origin: corsOrigins,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: 'Content-Type,Authorization',
  credentials: true,
});
```

**Verificación**:
- Sin env: wildcard
- Con env: orígenes específicos

---

#### Paso 3.5 — [A5] Server-generated idempotency key (0.5h)

**Archivos**: `backend/.../tokenize-card.usecase.ts`, `frontend PaymentSummaryScreen.tsx`

**Cambios**:
1. Backend devuelve `idempotencyKey` en `/payments/tokenize`
2. Frontend usa esa key para `/payments/charge`
3. Como fallback, usar hash determinístico de `(cardLastFour + items[])`

**Verificación**:
- Dos charges idénticos con misma key → segundo es idempotent (isDuplicate=true)
- Charges diferentes → ambos se procesan

---

## Fase 4: Calidad de Código (2-3h)

### Prioridad: BAJA-MEDIA — Impacto en mantenibilidad

#### Paso 4.1 — [M1] Tipado fuerte de navegación (1h)

**Archivos**: TODAS las screens

**Cambios**:
- Reemplazar interfaces manuales por `NativeStackScreenProps`
- Usar `useNavigation` tipado donde aplique
- Eliminar interfaces duplicadas

**Verificación**: TypeScript compila sin errores

---

#### Paso 4.2 — [M2] Fix useEffect + fetchProducts (0.5h)

**Archivo**: `src/screens/HomeScreen.tsx`

**Cambios**: Mover `fetchProducts` a `useCallback` y agregarlo a deps del `useEffect`.

---

#### Paso 4.3 — [M3] Selectors (0.5h)

**Archivos**: `src/store/selectors.ts` (NUEVO), screens que consumen estado

**Cambios**: Crear `createSelector` para `selectCartCount`, `selectTotalCents`, `selectGetProduct`.

---

#### Paso 4.4 — [M4] Unificar transforms (0.5h)

**Archivo**: `src/store/store.ts`

**Cambios**: Combinar `encryptor` + `immerFix` en un solo transform.

---

#### Paso 4.5 — [M5-M9] Fixes menores (1h)

**Archivos**: `ProductCard.tsx`, `HomeScreen.tsx`, `CardInfoScreen.tsx`, `cardDetection.ts`

**Cambios**:
- M5: `boxShadow` → `Platform.select({ ios: boxShadow, android: elevation })`
- M6: `gap` → `marginLeft`/`marginRight`
- M7: Ampliar brand detection
- M8: Simplificar `getBrandLogo`
- M9: CVC validation dinámica según brand

---

## Fase 5: UX (1h)

### Prioridad: BAJA — Mejoras de experiencia

#### Paso 5.1 — [m1] Pull-to-refresh (0.5h)

**Archivo**: `src/screens/HomeScreen.tsx`

**Cambios**: Agregar `refreshing` + `onRefresh` al FlatList.

#### Paso 5.2 — [m2] Loading states (0.5h)

**Archivos**: `src/screens/SelectProductScreen.tsx`, `src/screens/CardInfoScreen.tsx`

**Cambios**: Deshabilitar botones y mostrar spinner mientras se procesa.

#### Paso 5.3 — [m3, m4, m5] (0.5h)

**Archivos**: `ProductCard.tsx`, `api.ts`, `CheckoutScreen.tsx`

**Cambios**: Image caching, logging interceptor, unificar import.

---

## Orden de Ejecución Recomendado

```
Día 1 (5-6h)
├── F1.1 [B2] clearCardInfo race        (30 min)
├── F1.2 [B1] Items array               (2-3h)  ← bloqueante mayor
├── F1.3 [B3] Stock atomic              (2h)    ← backend
└── F2.1 [P1+P3] CVV/PAN out of Redux  (2h)

Día 2 (4-5h)
├── F2.2 [P2] HTTPS config              (1h)
├── F3.1 [A3] API Client singleton      (1h)
├── F3.2 [A2] Payment service           (2h)
├── F3.3 [A1] Total server-side         (1h)    ← depende de F1.2
├── F3.4 [A4] CORS                      (30 min)
└── F3.5 [A5] Idempotency key           (30 min)

Día 3 (3-4h)
├── F4.1 [M1] Navigation types          (1h)    ← mecánico
├── F4.2 [M2] useEffect fix             (30 min)
├── F4.3 [M3] Selectors                 (30 min)
├── F4.4 [M4] Transforms                (30 min)
├── F4.5 [M5-M9] Fixes menores          (1h)
├── F5.1 [m1] Pull-to-refresh           (30 min)
├── F5.2 [m2] Loading states            (30 min)
└── F5.3 [m3-m5] UX fixes minor         (30 min)
```

---

## Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| [B1] Cambio de contrato API rompe frontend existente | Alta | Alto | Versionar API (/v1/ → /v2/) o coordinar deploy frontend+backend |
| [P1+P3] Cambiar flujo de datos entre screens rompe navegación | Media | Alto | Tests de integración del flujo completo antes del deploy |
| [B3] atomicDecrement no soportado en SQLite | Baja | Medio | SQLite sí soporta updates atómicos con WHERE |
| [M4] Unificar transforms pierde datos persistidos | Media | Medio | Migración: si no hay datos previos, clean install; si hay, script de migración |
| [M1] Tipado fuerte puede requerir cambios en navigator | Baja | Bajo | No rompe funcionalidad, solo mejora tipos |

---

## Criterios de Éxito Post-Implementación

- [ ] **Flujo de pago completo**: Home → SelectProduct → Checkout → CardInfo → PaymentSummary → TransactionStatus funciona sin errores
- [ ] **Stock correcto**: 5 compras concurrentes con stock=5 → exactamente 5 transacciones exitosas
- [ ] **PCI compliant**: No hay CVV ni PAN completo en Redux DevTools ni en persistencia
- [ ] **Total verificado server-side**: El monto final se calcula en backend
- [ ] **TypeScript compila**: `npx tsc --noEmit` con 0 errores
- [ ] **Tests**: `npm test` pasa en frontend y backend
- [ ] **Cobertura**: ≥80% en código nuevo/modificado
- [ ] **Sin warnings**: `boxShadow`, `gap`, imports duplicados eliminados
