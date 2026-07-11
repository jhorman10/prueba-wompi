# SPEC — Corrección de Hallazgos de Auditoría Técnica

> **Proyecto**: Prueba-Wompi (React Native 0.86 + Nest.js)  
> **Fecha**: 2026-07-11  
> **Versión spec**: 1.0  
> **Clasificación**: Corrección de deuda técnica, seguridad y bugs

---

## Índice de Issues

| ID | Severidad | Título |
|----|-----------|--------|
| B1 | **BLOQUANTE** | Solo el primer item del carrito se cobra |
| B2 | **BLOQUANTE** | `cardLastFour` leído tras `clearCardInfo()` |
| B3 | **BLOQUANTE** | Race condition de stock sin atomicidad |
| P1 | **CRÍTICO** | CVV almacenado en Redux Persist (PCI DSS) |
| P2 | **CRÍTICO** | Datos de tarjeta en texto plano por HTTP (PCI DSS) |
| P3 | **CRÍTICO** | PAN completo en Redux después de tokenizar (PCI DSS) |
| A1 | **ALTO** | `totalAmount` confiado del cliente sin verificación server-side |
| A2 | **ALTO** | Lógica de pago completa en UI layer (SRP violado) |
| A3 | **ALTO** | Sin capa de servicio para API calls |
| A4 | **ALTO** | CORS `origin: '*'` en producción |
| A5 | **ALTO** | `idempotencyKey` generado client-side |
| M1 | **MEDIO** | Tipado inseguro de navegación en todas las screens |
| M2 | **MEDIO** | `fetchProducts` definido después de `useEffect` |
| M3 | **MEDIO** | Sin `createSelector` para estado derivado |
| M4 | **MEDIO** | Encryption + Immer transforms pueden racear |
| M5 | **MEDIO** | `boxShadow` no soportado en Android |
| M6 | **MEDIO** | `gap` en StyleSheet (compatibilidad RN 0.86) |
| M7 | **MEDIO** | Brand detection solo Visa/Mastercard |
| M8 | **MEDIO** | `getBrandLogo` devuelve string literal no usado como imagen |
| M9 | **MEDIO** | CVC validation incompleta (solo 3 dígitos) |
| m1 | **BAJO** | Sin pull-to-refresh en HomeScreen FlatList |
| m2 | **BAJO** | Sin loading state en botones críticos |
| m3 | **BAJO** | Sin caché de imágenes |
| m4 | **BAJO** | Sin logging/error tracking en API client |
| m5 | **BAJO** | `useDispatch` importado dos veces en CheckoutScreen |

---

## FASE 1 — ISSUES BLOQUANTES

---

### [B1] Solo el primer item del carrito se cobra

**Severidad**: BLOQUANTE  
**Archivo(s)**: `src/screens/PaymentSummaryScreen.tsx:60,89-100`  
**Backend**: `src/modules/payments/infrastructure/payments.controller.ts:37` y `src/modules/payments/application/process-payment.usecase.ts:8-16`

#### Problema
El método `handlePay` en `PaymentSummaryScreen.tsx` obtiene `const firstItem = cartItems[0]` y solo envía ese producto al backend. Sin embargo, `totalCents` suma el carrito completo. El usuario ve un total de $1,579.97 (3 productos) pero solo se cobra $999.99 (Laptop). El backend además acepta `productId` y `quantity` como campos escalares, no como un array de items.

#### Solución propuesta

**Frontend** (`PaymentSummaryScreen.tsx`):
1. Cambiar `ChargeRequest` en `api.ts` para enviar un array de `{ productId: string; quantity: number }` en lugar de scalar.
2. Iterar `cartItems` en lugar de usar `firstItem`.
3. Calcular `totalCents` server-side como sumatoria de precios unitarios × quantity.
4. Eliminar el cálculo local de `totalCents` de `handlePay` (pasa directamente los items).

**Backend** (`process-payment.usecase.ts` y `PaymentsController`):
1. Cambiar `ProcessPaymentInput.productId` y `ProcessPaymentInput.quantity` a `items: Array<{ productId: string; quantity: number }>`.
2. Verificar stock para CADA producto en el array.
3. Recalcular `totalAmount` server-side: sumar `product.price * item.quantity` para cada item.
4. Descontar stock de CADA producto en una transacción.
5. Crear un solo `TransactionEntity` con el `totalAmount` calculado y `items` como JSON.

#### Criterios de aceptación
- [ ] Al agregar 3 productos al carrito y pagar, el backend recibe los 3 items
- [ ] El stock se descuenta correctamente para cada producto
- [ ] El `totalAmount` se recalcula en el backend y coincide con el frontend
- [ ] Si un producto no tiene stock suficiente, se rechaza la transacción COMPLETA (no parcial)
- [ ] Tests unitarios actualizados en ambos lados

#### Riesgos
- Cambio de contrato de API: requiere migración de datos en transacciones existentes (aunque sean sandbox)
- Los tests existentes de `process-payment.usecase.spec.ts` deben actualizarse

---

### [B2] `cardLastFour` leído tras `clearCardInfo()`

**Severidad**: BLOQUANTE  
**Archivo(s)**: `src/screens/PaymentSummaryScreen.tsx:87,91,98`

#### Problema
En `handlePay` (línea 87): `dispatch(clearCardInfo())` se ejecuta ANTES de las líneas 91 y 98 que leen `checkout.cardInfo?.number` y `checkout.cardInfo?.cardholderName`. Aunque `checkout` es una closure del hook, el dispatch ocurre dentro del mismo callback síncrono, por lo que REDUX NO ha actualizado el store todavía cuando se ejecutan las siguientes líneas. Sin embargo, el closure `checkout` capturó el estado ANTES del dispatch, pero la referencia a `checkout.cardInfo` será la misma hasta el próximo render. **El bug real es que `clearCardInfo()` se ejecuta pero luego se intenta leer `checkout.cardInfo` que en el closure podría ser el viejo — pero como `clearCardInfo` es síncrono y el dispatch es síncrono (RTK), el estado global se actualiza antes de la siguiente línea. El problema es que `checkout.cardInfo?.number` usa el VALOR CAPTURADO, que para objetos es una REFERENCIA. Si Immer no ha finalizado el draft, podría ser undefined.**

**Solución**: Mover `clearCardInfo()` DESPUÉS de todas las lecturas de `checkout.cardInfo`.

#### Solución propuesta
1. En `handlePay`, mover `dispatch(clearCardInfo())` a DESPUÉS de las líneas 91 y 98.
2. Además, capturar `cardLastFour` y `cardholderName` en variables LOCALES ANTES de cualquier dispatch mutante:
   ```typescript
   const cardLastFour = (checkout.cardInfo?.number ?? '').slice(-4);
   const cardholderName = checkout.cardInfo?.cardholderName ?? '';
   // ... dispatch(clearCardInfo()) ... luego usar las variables locales
   ```
3. Enviar los valores capturados al `chargePayment` en lugar de leer de `checkout.cardInfo`.

#### Criterios de aceptación
- [ ] El `cardLastFour` enviado al backend coincide con la tarjeta del usuario
- [ ] El `cardholderName` se envía correctamente
- [ ] `clearCardInfo()` se ejecuta pero no afecta los datos enviados en el mismo request

#### Riesgos
- Ninguno significativo. Es puro reordenamiento de código.

---

### [B3] Race condition de stock sin atomicidad

**Severidad**: BLOQUANTE  
**Archivo(s)**: `backend/src/modules/payments/application/process-payment.usecase.ts:47,77`

#### Problema
El flujo actual: (1) Verifica stock → (2) Crea transacción PENDING → (3) Cambia a PROCESSING → (4) Cobra vía gateway → (5) SOLO entonces descuenta stock. Entre (1) y (5), otro request concurrente puede comprar el mismo producto, resultando en sobreventa (stock negativo).

#### Solución propuesta
Implementar **optimistic concurrency** con versionado de stock:

1. Agregar campo `version: number` a la entidad `Product` (inicia en 1, incrementa en cada update).
2. En `product.repository.ts`, cambiar `updateStock` a:
   ```typescript
   async function updateStock(id: string, newStock: number, expectedVersion: number): Promise<boolean>
   ```
   Que ejecute: `UPDATE products SET stock = :newStock, version = version + 1 WHERE id = :id AND version = :expectedVersion`.
3. Si `affected === 0` (versión desactualizada), relanzar con un error `ConcurrencyConflictError`.
4. En `process-payment.usecase.ts`, capturar `ConcurrencyConflictError` y reintentar hasta 3 veces con backoff de 100ms.
5. Alternativamente (más simple para SQLite), usar una **transacción serializable** que haga `SELECT ... FOR UPDATE` (no soportado en SQLite) o simplemente **atomic decrement**:
   ```sql
   UPDATE products SET stock = stock - :quantity WHERE id = :id AND stock >= :quantity
   ```
   Y verificar `affected > 0`.

Para SQLite (backend actual), usar el approach de **atomic decrement**:
```typescript
const affected = await this.productRepository.atomicDecrementStock(id, quantity);
if (!affected) {
  // Re-verificar si es por stock insuficiente o producto no existe
  throw new InsufficientStockError(...);
}
```

#### Criterios de aceptación
- [ ] 10 requests concurrentes por el mismo producto con stock=5: solo 5 completan, 5 fallan con `InsufficientStockError`
- [ ] No hay stock negativo bajo ningún escenario de concurrencia
- [ ] Tests de integración con concurrencia simulada

#### Riesgos
- Cambio en la interfaz del repositorio de productos
- Puede requerir migración de base de datos (aunque SQLite en sandbox no necesita)

---

## FASE 2 — ISSUES PCI DSS

---

### [P1] CVV almacenado en Redux Persist

**Severidad**: CRÍTICO  
**Archivo(s)**: `src/store/slices/checkoutSlice.ts:7`, `src/store/store.ts:51`, `src/screens/CardInfoScreen.tsx:131`

#### Problema
`checkoutSlice.cardInfo.cvc` se persiste en AsyncStorage encriptado. PCI DSS 3.2 explícitamente prohíbe almacenar el código de verificación de la tarjeta (CVV/CVC) después de la autorización. Incluso encriptado, no debe persistirse.

#### Solución propuesta
1. **No persistir CVC**: Agregar `checkoutSlice` a `blacklist` en lugar de `whitelist`, o crear un `transform` que elimine `cvc` antes de persistir:
   ```typescript
   // Transform para eliminar CVC antes de persistir
   const stripCvcTransform = createTransform(
     (inboundState: any, key: string) => {
       if (key === 'checkout' && inboundState.cardInfo) {
         const { cvc, ...rest } = inboundState.cardInfo;
         return { ...inboundState, cardInfo: rest };
       }
       return inboundState;
     },
     (outboundState: any) => outboundState,
     { whitelist: ['checkout'] },
   );
   ```
2. En `CardInfoScreen.tsx`, mantener CVC solo en estado LOCAL (`useState`), no en Redux:
   - No incluir `cvc` en `dispatch(setCardInfo({...}))`
   - Pasar CVC directamente a la API de tokenización sin pasar por Redux
3. Después de tokenizar en `PaymentSummaryScreen`, limpiar el CVC de cualquier lugar en memoria.

#### Criterios de aceptación
- [ ] `cvc` no aparece en el estado persistido de Redux
- [ ] `cvc` está presente solo en memoria durante la entrada de datos en `CardInfoScreen`
- [ ] Después de navegar desde CardInfoScreen, el CVC no es accesible desde Redux DevTools
- [ ] Tests que verifiquen que el transform limpia el CVC

#### Riesgos
- Cambia el contrato de `CardInfo` (campo `cvc` deja de estar en Redux)
- `PaymentSummaryScreen` ya no puede leer `checkout.cardInfo.cvc` (debe obtenerse de otro modo)

---

### [P2] Datos de tarjeta en texto plano por HTTP

**Severidad**: CRÍTICO  
**Archivo(s)**: `src/config/api.ts:19`

#### Problema
La URL base es `http://${API_HOST}:${API_PORT}/api` — todos los datos de tarjeta viajan en texto plano. PCI DSS 4.1 exige encriptación en tránsito (TLS 1.2+).

#### Solución propuesta
1. Hacer el protocolo configurable por entorno:
   ```typescript
   const API_PROTOCOL = process.env.EXPO_PUBLIC_API_PROTOCOL ?? __DEV__ ? 'http' : 'https';
   export const API_BASE_URL = `${API_PROTOCOL}://${API_HOST}:${API_PORT}/api`;
   ```
2. Para entorno de desarrollo local (emulador), permitir HTTP solo para `localhost`/`127.0.0.1`.
3. En producción/configuración real, forzar HTTPS.
4. Agregar **certificate pinning** en el `axios` instance cuando sea HTTPS.
5. Crear variable de entorno `API_PROTOCOL` con default condicional `__DEV__`.
6. Agregar un interceptor en `api.ts` que LOGREE una advertencia si se envía datos sensibles por HTTP.

#### Criterios de aceptación
- [ ] En `__DEV__` y conexión localhost: funciona con HTTP
- [ ] En producción: solo funciona con HTTPS
- [ ] Si se intenta enviar datos de tarjeta por HTTP a un host remoto, se rechaza
- [ ] Tests de integración del interceptor

#### Riesgos
- El emulador Android requiere `adb reverse` para HTTPS también (funciona igual)
- Puede requerir configurar certificados self-signed para desarrollo

---

### [P3] PAN completo en Redux después de tokenizar

**Severidad**: CRÍTICO  
**Archivo(s)**: `src/screens/CardInfoScreen.tsx:127`, `src/screens/PaymentSummaryScreen.tsx:87`

#### Problema
`setCardInfo` guarda el número de tarjeta COMPLETO en Redux. Solo se elimina cuando `clearCardInfo()` se ejecuta después de tokenizar. Si el usuario navega hacia atrás o la app se cierra, el PAN completo queda en memoria (y persistido en AsyncStorage encriptado).

#### Solución propuesta
1. **Nunca almacenar el PAN completo en Redux**. En `CardInfoScreen.tsx`:
   - Mantener `number` solo en estado LOCAL (`useState`)
   - Al hacer `dispatch(setCardInfo({...}))`, enviar SOLO `cardLastFour` y `brand`, NO el número completo
   - Truncar el número antes de dispatch: `const lastFour = number.slice(-4)`
2. Cambiar `CardInfo` interface en `checkoutSlice.ts`:
   ```typescript
   export interface CardInfo {
     lastFour: string;
     brand: CardBrand;
     cardholderName: string;
     // number y cvc se eliminan — solo existen en memoria local
   }
   ```
3. En `PaymentSummaryScreen.tsx`, obtener `number` mediante un callback o pasándolo por navigation params (no por Redux).
4. El `handlePay` recibe `number` y `cvc` como parámetros (desde estado local o navigation params), no desde Redux.

#### Criterios de aceptación
- [ ] El número de tarjeta completo NUNCA aparece en Redux DevTools
- [ ] Solo los últimos 4 dígitos se almacenan en el store
- [ ] `clearCardInfo()` ya no necesita limpiar el número porque nunca estuvo
- [ ] El flujo de pago funciona de principio a fin con el nuevo modelo

#### Riesgos
- Cambio significativo en el flujo de datos entre screens
- `CardInfoScreen` debe pasar datos sensibles a `PaymentSummaryScreen` — usar `route.params` con limpieza post-navegación

---

## FASE 3 — ISSUES ARQUITECTÓNICOS

---

### [A1] `totalAmount` confiado del cliente sin verificación server-side

**Severidad**: ALTO  
**Archivo(s)**: `backend/src/modules/payments/application/process-payment.usecase.ts:58`

#### Problema
El backend recibe `totalAmount` del cliente y lo usa directamente. Un cliente malicioso puede modificar este valor para pagar menos.

#### Solución propuesta
1. Eliminar `totalAmount` de `ProcessPaymentInput`.
2. En `process-payment.usecase.ts`, calcular el total server-side:
   ```typescript
   let totalAmount = 0;
   for (const item of input.items) {
     const product = await this.productRepository.findById(item.productId);
     if (!product) throw new Error(`Product ${item.productId} not found`);
     totalAmount += product.price * item.quantity;
   }
   ```
3. Devolver `totalAmount` en la respuesta para que el frontend pueda mostrarlo como confirmación.
4. En el frontend, mostrar el `totalAmount` devuelto server-side en lugar del calculado localmente.

#### Criterios de aceptación
- [ ] Si el cliente envía un `totalAmount` modificado, el backend lo IGNORA y recalcula
- [ ] La transacción registra el monto calculado server-side
- [ ] El frontend muestra el monto confirmado por el backend

#### Riesgos
- Depende de [B1] (items como array)
- Pueden aparecer discrepancias si el precio cambia entre el render y el pago

---

### [A2] Lógica de pago completa en UI layer

**Severidad**: ALTO  
**Archivo(s)**: `src/screens/PaymentSummaryScreen.tsx:54-132`

#### Problema
`handlePay` contiene 78 líneas con: validación, tokenización, dispatch de acciones, navegación, manejo de errores. Esto viola SRP, no es testeable en aislamiento, y está acoplado al ciclo de vida del componente.

#### Solución propuesta
1. Crear `src/services/paymentService.ts`:
   ```typescript
   export interface PaymentInput {
     items: CartItem[];
     cardInfo: { number: string; expiry: string; cvc: string; cardholderName: string };
     products: Product[];
   }

   export interface PaymentResult {
     transaction: TransactionRecord;
     token: string;
   }

   export async function processPayment(
     input: PaymentInput,
     api: ApiClient,
   ): Promise<PaymentResult> {
     // 1. Tokenizar
     // 2. Calcular total
     // 3. Cobrar
     // 4. Devolver resultado
   }
   ```
2. En `PaymentSummaryScreen.tsx`, reducir `handlePay` a:
   ```typescript
   const handlePay = useCallback(async () => {
     setProcessing(true);
     try {
       const result = await processPayment(
         { items: cartItems, cardInfo: {...}, products },
         createApiClient(API_BASE_URL),
       );
       dispatch(setToken(result.token));
       dispatch(setTransactionId(result.transaction.id));
       dispatch(addTransaction(result.transaction));
       dispatch(advanceStep());
       dispatch(clearCart());
       navigation.navigate('TransactionStatus', { transaction: result.transaction });
     } catch (err) {
       // manejo de error
     }
   }, [...]);
   ```
3. Escribir tests unitarios para `paymentService.processPayment()`.

#### Criterios de aceptación
- [x] `paymentService.processPayment` es testeable con mocks
- [x] El componente `PaymentSummaryScreen` no tiene lógica de negocio de pagos
- [x] Cobertura de tests ≥ 85% en el nuevo servicio
- [x] El flujo completo funciona igual que antes

#### Riesgos
- Ninguno si se extrae correctamente la lógica

---

### [A3] Sin capa de servicio para API calls

**Severidad**: ALTO  
**Archivo(s)**: `src/screens/HomeScreen.tsx:41`, `src/screens/PaymentSummaryScreen.tsx:59`

#### Problema
Cada screen crea su propio `createApiClient(API_BASE_URL)` directamente. No hay un punto central para: refresh de token, logging, errores globales, retry, timeout unificado.

#### Solución propuesta
1. Crear `src/services/apiClient.ts` como singleton:
   ```typescript
   let clientInstance: AxiosInstance | null = null;

   export function getApiClient(): AxiosInstance {
     if (!clientInstance) {
       clientInstance = axios.create({
         baseURL: API_BASE_URL,
         timeout: 15000,
         headers: { 'Content-Type': 'application/json' },
       });
       // Interceptor de request: logging
       clientInstance.interceptors.request.use((config) => {
         if (__DEV__) console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
         return config;
       });
       // Interceptor de response: error handling global
       clientInstance.interceptors.response.use(
         (response) => response,
         (error) => {
           if (error.response?.status === 401) {
             // handle session expiry
           }
           return Promise.reject(error);
         },
       );
     }
     return clientInstance;
   }
   ```
2. Actualizar `api.ts` para usar `getApiClient()` internamente.
3. Ninguna screen debe llamar `createApiClient` directamente.
4. Los tests pueden resetear el singleton.

#### Criterios de aceptación
- [ ] Todas las llamadas API pasan por el mismo cliente Axios
- [ ] Los interceptores funcionan correctamente
- [ ] En `__DEV__` se loguean todas las requests
- [ ] Tests con mock del singleton

#### Riesgos
- Singleton puede dificultar tests si no se resetea entre tests

---

### [A4] CORS `origin: '*'` en producción

**Severidad**: ALTO  
**Archivo(s)**: `backend/src/main.ts:10`

#### Problema
`app.enableCors({ origin: '*' })` permite cualquier origen. En producción, esto expone la API a ataques CSRF y scraping.

#### Solución propuesta
1. Hacer CORS configurable por variable de entorno:
   ```typescript
   const corsOrigins = process.env.CORS_ORIGINS?.split(',') ?? ['*'];
   app.enableCors({
     origin: corsOrigins.length === 1 && corsOrigins[0] === '*'
       ? '*'  // desarrollo
       : corsOrigins,  // producción: lista blanca
     methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
     allowedHeaders: 'Content-Type,Authorization',
     credentials: true,
   });
   ```
2. Agregar a `.env.example`: `CORS_ORIGINS=http://localhost:8081`
3. En producción, el deploy debe configurar `CORS_ORIGINS` con los orígenes específicos.

#### Criterios de aceptación
- [x] Sin variable `CORS_ORIGINS`: funciona como hoy (wildcard para desarrollo)
- [x] Con `CORS_ORIGINS` definido: solo permite esos orígenes
- [x] Tests de integración de CORS

#### Riesgos
- Bajo. Es cambio configurable.

---

### [A5] `idempotencyKey` generado client-side

**Severidad**: ALTO  
**Archivo(s)**: `src/screens/PaymentSummaryScreen.tsx:90`, `backend/src/modules/payments/application/process-payment.usecase.ts:36`

#### Problema
El cliente genera `idempotencyKey` como `${Date.now()}-${Math.random().toString(36).slice(2,8)}`. Esto no garantiza idempotencia: el usuario puede generar una key diferente en cada intento, resultando en múltiples cargos.

#### Solución propuesta
1. **Server-generated idempotency key**: El backend debe generar y devolver una key en el endpoint `POST /payments/tokenize`.
2. **Para el charge**: El cliente usa la key devuelta por el server.
3. **Si no hay tokenize previo** (caso edge): Usar hash de `(cardLastFour + totalAmount + items[])` como key determinística.
4. En el backend, mejorar la verificación: el `idempotencyKey` debe incluir un hash del payload completo para detectar manipulación.

#### Criterios de aceptación
- [x] Dos requests idénticas con la misma key: solo una se procesa
- [x] Dos requests con diferente key pero mismo contenido: se procesan ambas (intencional)
- [x] El cliente no puede manipular la key para evitar la detección de duplicados

#### Riesgos
- Cambio en el contrato de API de tokenize

---

## FASE 4 — ISSUES DE CALIDAD DE CÓDIGO

---

### [M1] Tipado inseguro de navegación

**Severidad**: MEDIO  
**Archivo(s)**: TODAS las screens

#### Problema
Cada screen declara su propia interfaz de props con `navigation?: { navigate: (screen: string) => void }` en lugar de usar el tipado fuerte de React Navigation.

#### Solución propuesta
1. En `AppNavigator.tsx`, exportar el tipo `RootStackParamList` (ya existe).
2. En cada screen, reemplazar la interfaz manual por:
   ```typescript
   import { NativeStackScreenProps } from '@react-navigation/native-stack';
   import { RootStackParamList } from '../navigation/AppNavigator';

   type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;
   export function HomeScreen({ navigation }: Props) { ... }
   ```
3. Usar `useNavigation<NativeStackNavigationProp<RootStackParamList, 'Home'>>()` donde sea necesario.
4. Eliminar las interfaces duplicadas (`HomeScreenProps`, `CheckoutScreenProps`, etc.).

#### Criterios de aceptación
- [ ] TypeScript compila sin errores
- [ ] `navigation.navigate('Home')` acepta solo nombres de ruta válidos
- [ ] `navigation.navigate('SelectProduct', { product })` valida los params

#### Riesgos
- Bajo. Es solo tipado.

---

### [M2] `fetchProducts` definido después de `useEffect`

**Severidad**: MEDIO  
**Archivo(s)**: `src/screens/HomeScreen.tsx:33-49`

#### Problema
`useEffect(() => { fetchProducts(); }, [])` referencia `fetchProducts` que se define después. Aunque funciona por closure, el linter marca warning (suprimido con comentario). Patrón frágil.

#### Solución propuesta
Mover `fetchProducts` DENTRO del `useEffect` o usar `useCallback`:
```typescript
const fetchProducts = useCallback(async () => {
  // ...
}, [dispatch]);

useEffect(() => {
  fetchProducts();
}, [fetchProducts]);
```

O mejor, extraer la lógica a un custom hook `useProducts()`.

#### Criterios de aceptación
- [x] No hay warnings de linter
- [x] No hay re-renders infinitos
- [x] `fetchProducts` no causa stale closures

#### Riesgos
- Bajo

---

### [M3] Sin `createSelector` para estado derivado

**Severidad**: MEDIO  
**Archivo(s)**: `src/store/`

#### Problema
Cada componente lee slices completos y deriva datos en el render (`totalCents`, `cartCount`, `getProduct`). Esto recalcula en cada render y acopla componentes a la forma del store.

#### Solución propuesta
1. Crear `src/store/selectors.ts`:
   ```typescript
   import { createSelector } from '@reduxjs/toolkit';
   import { RootState } from './store';

   const selectCartItems = (state: RootState) => state.cart?.items ?? [];
   const selectProducts = (state: RootState) => state.products.items;
   const selectCheckout = (state: RootState) => state.checkout;

   export const selectCartCount = createSelector(
     [selectCartItems],
     (items) => items.reduce((sum, item) => sum + item.quantity, 0),
   );

   export const selectTotalCents = createSelector(
     [selectCartItems, selectProducts],
     (items, products) => items.reduce((sum, item) => {
       const product = products.find(p => p.id === item.productId);
       return sum + (product?.price ?? 0) * item.quantity;
     }, 0),
   );

   export const selectGetProduct = createSelector(
     [selectProducts],
     (products) => (productId: string) => products.find(p => p.id === productId),
   );
   ```
2. Actualizar screens para usar los selectores.

#### Criterios de aceptación
- [x] `selectCartCount` y `selectTotalCents` son memoizados
- [x] Los componentes consumen selectores, no slices directamente
- [x] Tests de selectores

#### Riesgos
- Bajo. Refactor localizado.

---

### [M4] Encryption + Immer transforms pueden racear

**Severidad**: MEDIO  
**Archivo(s)**: `src/store/store.ts:52`, `src/services/encryption.ts`

#### Problema
El `encryptor` transform es async (in/out devuelven Promise), mientras que `immerFix` es sync. El orden de ejecución de transforms en redux-persist puede causar que `immerFix` intente limpiar propiedades Immer que el `encryptor` aún está procesando.

#### Solución propuesta
1. Unificar transforms: el `immerFix` debe ejecutarse DENTRO del `encryptor.out` (desencriptar → limpiar immer).
2. O mejor: combinar ambos en un solo transform:
   ```typescript
   const combinedTransform = createTransform(
     async (inboundState: any, key: string) => {
       // Antes de persistir: encriptar
       if (ENCRYPTED_KEYS.includes(key)) {
         await EncryptedStorage.setItem(`persist:${key}`, btoa(JSON.stringify(inboundState)));
       }
       return inboundState;
     },
     async (outboundState: any, key: string) => {
       // Al rehidratar: desencriptar y limpiar Immer
       if (ENCRYPTED_KEYS.includes(key)) {
         try {
           const stored = await EncryptedStorage.getItem(`persist:${key}`);
           if (stored) {
             const decoded = JSON.parse(atob(stored));
             return stripImmer(decoded);
           }
         } catch {}
       }
       return stripImmer(outboundState);
     },
     { whitelist: ['cart', 'checkout', 'transactions'] },
   );
   ```
3. Eliminar `encryptor` import y usar solo `combinedTransform`.

#### Criterios de aceptación
- [x] Los datos persistidos están encriptados
- [x] Al rehidratar, no hay propiedades Immer internas
- [x] No hay race conditions ni errores de "undefined is not an object"

#### Riesgos
- Cambio en el mecanismo de persistencia. Podría perder datos existentes al migrar.

---

### [M5] `boxShadow` no soportado en Android

**Severidad**: MEDIO  
**Archivo(s)**: `src/components/ProductCard.tsx:56`, `src/screens/HomeScreen.tsx:166`

#### Problema
`boxShadow` es una propiedad específica de iOS (React Native). En Android no tiene efecto. Se debe usar `elevation` para sombras en Android.

#### Solución propuesta
1. Crear helper o usar `Platform.select`:
   ```typescript
   import { Platform, StyleSheet } from 'react-native';

   const shadow = Platform.select({
     ios: {
       boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
     },
     android: {
       elevation: 3,
     },
   });
   ```
2. Aplicar a los estilos de `card` y `cartBar`.

#### Criterios de aceptación
- [ ] En iOS: sombra con `boxShadow`
- [ ] En Android: sombra con `elevation`
- [ ] Visualmente similares en ambas plataformas

#### Riesgos
- Bajo. Solo estilos.

---

### [M6] `gap` en StyleSheet

**Severidad**: MEDIO  
**Archivo(s)**: `src/screens/CardInfoScreen.tsx:245`

#### Problema
`gap: 12` en un `flexDirection: 'row'`. `gap` fue agregado a React Native en 0.71 pero puede tener comportamiento inconsistente en algunas versiones. RN 0.86 lo soporta, pero para máxima compatibilidad se recomienda usar `margin`.

#### Solución propuesta
Reemplazar `gap: 12` por `marginLeft`/`marginRight` en los hijos:
```typescript
row: {
  flexDirection: 'row',
},
halfField: {
  flex: 1,
  marginRight: 6, // primer hijo
},
halfField: {
  flex: 1,
  marginLeft: 6, // segundo hijo
},
```

#### Criterios de aceptación
- [x] El espaciado entre campos es de 12px en todas las plataformas
- [x] No hay warning de estilo

#### Riesgos
- Bajo.

---

### [M7] Brand detection solo Visa/Mastercard

**Severidad**: MEDIO  
**Archivo(s)**: `src/services/cardDetection.ts:10-15`

#### Problema
`detectBrand` solo reconoce Visa (empieza con 4) y Mastercard (51-55). Amex, Discover, Diners, JCB, etc. se clasifican como 'unknown'.

#### Solución propuesta
Ampliar `CardBrand` type y `detectBrand`:
```typescript
export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'discover' | 'diners' | 'jcb' | 'unknown';

export function detectBrand(cardNumber: string): CardBrand {
  const cleaned = cardNumber.replace(/\D/g, '');
  if (!cleaned) return 'unknown';

  if (cleaned.startsWith('4')) return 'visa';
  if (/^5[1-5]/.test(cleaned)) return 'mastercard';
  if (/^3[47]/.test(cleaned)) return 'amex';
  if (/^6(?:011|4[4-9]|5)/.test(cleaned)) return 'discover';
  if (/^3(?:0[0-5]|[68])/.test(cleaned)) return 'diners';
  if (/^35(?:2[89]|[3-8][0-9])/.test(cleaned)) return 'jcb';
  return 'unknown';
}
```

#### Criterios de aceptación
- [ ] Amex (34xxxx, 37xxxx) → 'amex'
- [ ] Discover (6011xx, 65xxxx) → 'discover'
- [ ] Diners (300xxx-305xxx, 36xxxx, 38xxxx-39xxxx) → 'diners'
- [ ] JCB (3528xx-3589xx) → 'jcb'
- [ ] Tests para cada marca

#### Riesgos
- Bajo.

---

### [M8] `getBrandLogo` devuelve string literal no usado como imagen

**Severidad**: MEDIO  
**Archivo(s)**: `src/services/cardDetection.ts:54-65`, `src/screens/CardInfoScreen.tsx:155-161`

#### Problema
`getBrandLogo` devuelve strings como `'visa-logo'` que nunca se usan como fuente de imagen. En `CardInfoScreen`, se renderiza texto hardcodeado "VISA" o "MC" ignorando el valor devuelto.

#### Solución propuesta
**Opción A (sin assets de imagen)**: Simplificar eliminando `getBrandLogo` y renderizando el nombre textual directamente:
```typescript
const brandName = brand === 'visa' ? 'Visa' : brand === 'mastercard' ? 'Mastercard' : brand === 'amex' ? 'Amex' : '';
```

**Opción B (con assets)**: Crear assets de logos reales y referenciarlos desde un map:
```typescript
const brandLogos: Record<CardBrand, ImageSourcePropType | null> = {
  visa: require('../assets/visa.png'),
  mastercard: require('../assets/mastercard.png'),
  amex: require('../assets/amex.png'),
  discover: require('../assets/discover.png'),
  diners: require('../assets/diners.png'),
  jcb: require('../assets/jcb.png'),
  unknown: null,
};
```

Recomendación: **Opción A** (mínimo esfuerzo, sin assets nuevos).

#### Criterios de aceptación
- [x] `getBrandLogo` eliminado o reemplazado por `getBrandName`
- [x] Se muestra el nombre correcto para cada brand detectada
- [x] TypeScript compila

#### Riesgos
- Bajo.

---

### [M9] CVC validation incompleta

**Severidad**: MEDIO  
**Archivo(s)**: `src/screens/CardInfoScreen.tsx:109`

#### Problema
`cvc.length < 3` rechaza CVC válidos de 4 dígitos (Amex). También permite CVC de 0 dígitos.

#### Solución propuesta
```typescript
const expectedCvcLength = brand === 'amex' ? 4 : 3;
if (cvc.length !== expectedCvcLength) {
  newErrors.cvc = brand === 'amex' ? 'Enter 4-digit CVC' : 'Enter 3-digit CVC';
}
```

#### Criterios de aceptación
- [ ] Visa/MC/Discover: CVC de 3 dígitos aceptado
- [ ] Amex: CVC de 4 dígitos aceptado
- [ ] CVC de longitud incorrecta muestra error claro

#### Riesgos
- Bajo.

---

## FASE 5 — ISSUES DE UX

---

### [m1] Sin pull-to-refresh en HomeScreen FlatList

**Severidad**: BAJO  
**Archivo(s)**: `src/screens/HomeScreen.tsx:84`

#### Solución propuesta
Agregar prop `refreshing` y `onRefresh` al `FlatList`:
```typescript
const [refreshing, setRefreshing] = useState(false);

const handleRefresh = useCallback(async () => {
  setRefreshing(true);
  await fetchProducts();
  setRefreshing(false);
}, [fetchProducts]);

// En FlatList:
<FlatList
  refreshing={refreshing}
  onRefresh={handleRefresh}
  ...
/>
```

---

#### Criterios de aceptación
- [x] `FlatList` en `HomeScreen` recibe `refreshing` y `onRefresh`
- [x] `handleRefresh` invoca `fetchProducts` y alterna `refreshing`

### [m2] Sin loading state en botones críticos

**Severidad**: BAJO  
**Archivo(s)**: `src/screens/SelectProductScreen.tsx`, `src/screens/CardInfoScreen.tsx`

#### Solución propuesta
- `SelectProductScreen`: Agregar `useState(false)` para el botón "Add to Cart". Deshabilitar y mostrar indicador mientras se procesa el dispatch.
- `CardInfoScreen`: Agregar `useState(false)` para el botón "Continue". Deshabilitar mientras se valida y navega.

---

#### Criterios de aceptación
- [x] `SelectProductScreen`: botón "Add to Cart" se deshabilita y muestra indicador durante el dispatch
- [x] `CardInfoScreen`: botón "Continue" se deshabilita y muestra indicador durante la validación/navegación

### [m3] Sin caché de imágenes

**Severidad**: BAJO  
**Archivo(s)**: `src/components/ProductCard.tsx:23`

#### Solución propuesta
Instalar `react-native-fast-image` (o usar `Image` con `cache: 'force-cache'` en iOS):
```typescript
import FastImage from 'react-native-fast-image';

// En ProductCard:
<FastImage
  source={{ uri: product.imageUrl, priority: FastImage.priority.normal }}
  style={styles.image}
  resizeMode={FastImage.resizeMode.cover}
/>
```

Si se quiere evitar dependencias, en iOS se puede usar `cache: 'force-cache'` en `Image` nativo.

---

#### Criterios de aceptación
- [x] `Image` en `ProductCard` usa `cache: 'force-cache'` (nativo, sin dependencias nuevas)
- [x] Sin regresiones de lint/runtime

### [m4] Sin logging/error tracking en API client

**Severidad**: BAJO  
**Archivo(s)**: `src/services/api.ts`

#### Solución propuesta
Agregar interceptor de logging condicional (`__DEV__`) y error tracking:
```typescript
client.interceptors.response.use(
  (response) => {
    if (__DEV__) console.log(`[API] ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    if (__DEV__) {
      console.error(`[API Error] ${error.config?.url}:`, error.message);
    }
    // Aquí se integraría Sentry, Crashlytics, etc.
    return Promise.reject(error);
  },
);
```

---

#### Criterios de aceptación
- [x] Interceptor de respuesta en el singleton (`apiClient.ts`) registra request/response y errores en `__DEV__`
- [x] Punto de extensión marcado claramente (sin SDK externo: Sentry/Crashlytics)

### [m5] `useDispatch` importado dos veces en CheckoutScreen

**Severidad**: BAJO  
**Archivo(s)**: `src/screens/CheckoutScreen.tsx:3,8`

#### Solución propuesta
Unificar imports:
```typescript
import { useSelector, useDispatch } from 'react-redux';
```
Eliminar la línea 8.

---

#### Criterios de aceptación
- [x] `CheckoutScreen` une los dos imports en `import { useSelector, useDispatch } from 'react-redux';`
- [x] Se elimina la línea duplicada de `useDispatch`

## Resumen de Cambios por Archivo

| Archivo | Issues |
|---------|--------|
| `mobile/src/screens/PaymentSummaryScreen.tsx` | B1, B2, A2, P2, P3 |
| `mobile/src/screens/CardInfoScreen.tsx` | P1, P3, M6, M8, M9, m2 |
| `mobile/src/screens/HomeScreen.tsx` | A3, M2, M5, m1 |
| `mobile/src/screens/SelectProductScreen.tsx` | m2 |
| `mobile/src/screens/CheckoutScreen.tsx` | m5 |
| `mobile/src/components/ProductCard.tsx` | M5, m3 |
| `mobile/src/services/api.ts` | A3, P2, m4 |
| `mobile/src/services/paymentService.ts` | **NUEVO** — A2 |
| `mobile/src/services/cardDetection.ts` | M7, M8 |
| `mobile/src/store/store.ts` | M4, P1 |
| `mobile/src/store/selectors.ts` | **NUEVO** — M3 |
| `mobile/src/store/slices/checkoutSlice.ts` | P1, P3 |
| `mobile/src/store/slices/cartSlice.ts` | (sin cambios) |
| `mobile/src/store/slices/transactionsSlice.ts` | (sin cambios) |
| `mobile/src/config/api.ts` | P2 |
| `mobile/src/navigation/AppNavigator.tsx` | M1 |
| `mobile/src/screens/SplashScreen.tsx` | M1 |
| `mobile/src/screens/TransactionStatusScreen.tsx` | M1 |
| `backend/.../payments.controller.ts` | A4, A5, B1 |
| `backend/.../process-payment.usecase.ts` | A1, A5, B1, B3 |
| `backend/.../product.repository.ts` | B3 (nuevo método atomicDecrementStock) |
| `backend/.../tokenize-card.usecase.ts` | A5 |
| `backend/src/main.ts` | A4 |
