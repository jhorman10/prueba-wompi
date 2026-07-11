export interface CorsConfig {
  origin: string | string[];
  methods: string;
  allowedHeaders: string;
  credentials: boolean;
}

/**
 * Build CORS options from environment.
 *
 * - CORS_ORIGINS unset  → wildcard '*' (development behavior unchanged)
 * - CORS_ORIGINS set     → explicit whitelist (comma-separated list)
 *
 * Wildcard is never returned when an explicit list is provided, so production
 * deployments must set CORS_ORIGINS to their allowed origins.
 */
export function buildCorsOptions(): CorsConfig {
  const raw = process.env.CORS_ORIGINS;
  const origins = raw
    ? raw
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)
    : ['*'];

  return {
    origin:
      origins.length === 1 && origins[0] === '*' ? '*' : origins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type,Authorization',
    credentials: true,
  };
}
