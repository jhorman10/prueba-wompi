import { Platform } from 'react-native';

/**
 * API base URL configuration.
 *
 * Android emulator: uses 127.0.0.1 with `adb reverse tcp:3000 tcp:3000`
 *   (run this once per emulator session to forward the port).
 * iOS simulator: can use localhost directly.
 * Physical devices: should use the machine's LAN IP.
 *
 * Protocol: HTTP in dev (localhost/127.0.0.1), HTTPS in production.
 * Controlled by EXPO_PUBLIC_API_PROTOCOL env var (defaults to http in dev).
 */
const API_HOST = Platform.select({
  android: '127.0.0.1',
  ios: 'localhost',
  default: 'localhost',
});

const API_PORT = 3000;

// Allow overriding protocol via env. In dev on localhost, HTTP is fine.
// In production, MUST be https.
const API_PROTOCOL = process.env.EXPO_PUBLIC_API_PROTOCOL ?? (__DEV__ ? 'http' : 'https');

/**
 * Validates that sensitive data (card info) is not sent over HTTP to non-local hosts.
 */
function assertSecureConnection(): void {
  if (__DEV__ && API_PROTOCOL === 'http') {
    const isLocalhost =
      API_HOST === 'localhost' ||
      API_HOST === '127.0.0.1' ||
      API_HOST?.startsWith('192.168.') ||
      API_HOST?.startsWith('10.') ||
      API_HOST?.startsWith('172.16.');
    if (!isLocalhost) {
      console.warn(
        '[PCI WARNING] Sending sensitive data over HTTP to non-localhost host! ' +
          'Set EXPO_PUBLIC_API_PROTOCOL=https for production.',
      );
    }
  }
}

assertSecureConnection();

export const API_BASE_URL = `${API_PROTOCOL}://${API_HOST}:${API_PORT}/api`;
