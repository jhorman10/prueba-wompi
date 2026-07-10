export interface EnvConfig {
  port: number;
  gatewayUrl: string;
  gatewayApiKey: string;
  nodeEnv: string;
}

export function loadEnvConfig(): EnvConfig {
  return {
    port: parseInt(process.env.PORT || '3000', 10),
    gatewayUrl: process.env.GATEWAY_URL || 'https://sandbox-gateway.example.com',
    gatewayApiKey: process.env.GATEWAY_API_KEY || 'sandbox-key',
    nodeEnv: process.env.NODE_ENV || 'development',
  };
}
