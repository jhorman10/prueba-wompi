export interface CorsConfig {
  origin: string | string[];
  methods: string;
  allowedHeaders: string;
  credentials: boolean;
}

/**
 * Build CORS options from environment.
 *
 * - CORS_ORIGINS unset in development → wildcard '*' (development behavior)
 * - CORS_ORIGINS unset in production → throws error (production must configure explicitly)
 * - CORS_ORIGINS set → explicit whitelist (comma-separated list)
 *
 * Wildcard '*' is never allowed in production; production deployments MUST set
 * CORS_ORIGINS to their allowed origins.
 */
export function buildCorsOptions(nodeEnv: string = process.env.NODE_ENV || 'development'): CorsConfig {
  const raw = process.env.CORS_ORIGINS;
  const origins = raw
    ? raw
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)
    : [];

  // In production, CORS_ORIGINS is required
  if (nodeEnv === 'production' && origins.length === 0) {
    throw new Error(
      'CORS_ORIGINS environment variable is required in production. ' +
      'Set CORS_ORIGINS to a comma-separated list of allowed origins (e.g. "https://app.example.com,https://admin.example.com")',
    );
  }

  // Development: allow wildcard if not configured
  const effectiveOrigins = origins.length > 0 ? origins : ['*'];

  return {
    origin:
      effectiveOrigins.length === 1 && effectiveOrigins[0] === '*' ? '*' : effectiveOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type,Authorization',
    credentials: true,
  };
}
