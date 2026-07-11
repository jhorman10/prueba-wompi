import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { loadEnvConfig } from './config/env.config';
import { buildCorsOptions } from './config/cors.config';

async function bootstrap() {
  const config = loadEnvConfig();

  const app = await NestFactory.create(AppModule);

  app.enableCors(buildCorsOptions());

  app.setGlobalPrefix('api');

  await app.listen(config.port, '0.0.0.0');
  console.log(`Application running on port ${config.port}`);
}

bootstrap();
