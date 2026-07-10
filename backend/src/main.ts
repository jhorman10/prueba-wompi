import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { loadEnvConfig } from './config/env.config';

async function bootstrap() {
  const config = loadEnvConfig();

  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type,Authorization',
  });

  app.setGlobalPrefix('api');

  await app.listen(config.port);
  console.log(`Application running on port ${config.port}`);
}

bootstrap();
