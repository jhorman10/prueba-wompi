interface TransformState {
  [key: string]: unknown;
}

/**
 * Removes Immer's internal draft markers (string keys beginning with `_`,
 * e.g. `_y`, `_z`, `_A`) from rehydrated state at every nesting level, so
 * persisted slices are never rehydrated carrying draft noise. Real app
 * state has no `_`-prefixed field names, so only Immer internals are dropped.
 */
function stripImmer(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => stripImmer(item));
  }
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>)) {
      if (!key.startsWith('_')) {
        result[key] = stripImmer((value as Record<string, unknown>)[key]);
      }
    }
    return result;
  }
  return value;
}

/**
 * redux-persist transform.
 *
 * Encryption-at-rest is delegated to `react-native-encrypted-storage`, which is
 * wired in as the persist `storage` engine in `src/store/store.ts`. The OS-backed
 * secure store already encrypts everything written to it, so this transform does
 * no (fake) encryption of its own and never writes data to another store — doing
 * so would only create a redundant, plaintext copy in AsyncStorage.
 *
 * Its only remaining responsibility is stripping Immer internals from
 * rehydrated state via the `out` direction.
 */
export function createEncryptor() {
  return {
    in: (
      state: TransformState,
      _key: string | number | symbol,
      _fullState?: unknown,
    ): TransformState => state,
    out: (
      _state: TransformState,
      _key: string | number | symbol,
      _fullState?: unknown,
    ): TransformState => stripImmer(_state) as TransformState,
  };
}
