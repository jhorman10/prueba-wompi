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
 *  - Android emulator: 10.0.2.2 (special alias for host machine)
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
    android: '10.0.2.2',
    ios: 'localhost',
    default: 'localhost',
  });
  const protocol = __DEV__ ? 'http' : 'https';
  return `${protocol}://${host}:${DEFAULT_PORT}/api`;
}

/**
 * Validates the API connection for PCI DSS compliance.
 *
 * - Development: warns if sending card data over HTTP to non-localhost
 * - Production: throws if API_URL is not HTTPS (card data would be exposed)
 */
function assertSecureConnection(baseUrl: string): void {
  try {
    const { hostname, protocol } = new URL(baseUrl);
    const isLocal = isLocalhost(hostname);
    const isHttps = protocol === 'https:';

    if (__DEV__) {
      // Development: warn only
      if (!isHttps && !isLocal) {
        console.warn(
          '[PCI WARNING] Sending sensitive data over HTTP to non-localhost host! ' +
            'Set API_URL to an https endpoint for production.',
        );
      }
    } else {
      // Production: enforce HTTPS strictly
      if (!isHttps) {
        const errMsg =
          '[PCI VIOLATION] API_URL must use HTTPS in production. ' +
          'Card data would be transmitted in plaintext. ' +
          `Current: ${protocol}//${hostname}`;
        console.error(errMsg);
        throw new Error(errMsg);
      }
      if (!isLocal && !isHttps) {
        const errMsg =
          '[PCI VIOLATION] Production API_URL must use HTTPS for non-localhost hosts.';
        console.error(errMsg);
        throw new Error(errMsg);
      }
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes('PCI')) throw e;
    // Non-URL fallback value; ignore in dev, but log in prod
    if (!__DEV__) {
      console.error('[PCI] Invalid API_URL format:', baseUrl);
    }
  }
}

export const API_BASE_URL: string = API_URL || buildDefaultBaseUrl();

assertSecureConnection(API_BASE_URL);
