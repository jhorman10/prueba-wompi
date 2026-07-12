import { Platform } from 'react-native';
import { API_URL } from '@env';

/**
 * API base URL configuration.
 *
 * The backend URL is supplied via environment (`mobile/.env`, injected at build
 * time by react-native-dotenv as `API_URL`). This keeps the gateway/host out of
 * source control and lets physical devices point at the machine's LAN IP.
 *
 * When `API_URL` is not set (e.g. a missing .env during local dev), we fall back
 * to a platform-appropriate localhost address so the simulator/emulator still
 * works without any configuration.
 *
 * Dev host notes:
 *  - Android emulator: 127.0.0.1 (with `adb reverse tcp:3000 tcp:3000`)
 *  - iOS simulator: localhost
 *  - Physical devices: set API_URL to http://<LAN_IP>:3000/api
 */

const DEFAULT_PORT = 3000;

function isLocalhost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('172.16.')
  );
}

function buildDefaultBaseUrl(): string {
  const host = Platform.select({
    android: '127.0.0.1',
    ios: 'localhost',
    default: 'localhost',
  });
  const protocol = __DEV__ ? 'http' : 'https';
  return `${protocol}://${host}:${DEFAULT_PORT}/api`;
}

/**
 * Warns (dev only) when sensitive card data would be sent over HTTP to a
 * non-localhost host — a PCI DSS smell. No-op in production builds.
 */
function assertSecureConnection(baseUrl: string): void {
  if (!__DEV__) {
    return;
  }
  try {
    const { hostname, protocol } = new URL(baseUrl);
    if (protocol === 'http:' && !isLocalhost(hostname)) {
      console.warn(
        '[PCI WARNING] Sending sensitive data over HTTP to non-localhost host! ' +
          'Set API_URL to an https endpoint for production.',
      );
    }
  } catch {
    // Non-URL fallback value; ignore in dev.
  }
}

export const API_BASE_URL: string = API_URL || buildDefaultBaseUrl();

assertSecureConnection(API_BASE_URL);
