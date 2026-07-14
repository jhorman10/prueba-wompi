import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { loadEnvConfig } from './config/env.config';
import { buildCorsOptions } from './config/cors.config';
import { join } from 'path';

async function bootstrap() {
  const config = loadEnvConfig();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors(buildCorsOptions(config.nodeEnv));

  app.useStaticAssets(join(__dirname, '..', 'public', 'images'), {
    prefix: '/images',
  });

  app.setGlobalPrefix('api');

  await app.listen(config.port, '0.0.0.0');
  console.log(`Application running on port ${config.port}`);
}

bootstrap();
