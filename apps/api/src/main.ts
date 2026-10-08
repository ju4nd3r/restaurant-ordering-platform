import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cookieParser = require('cookie-parser');
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Security headers
  app.use(
    helmet({
      contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Cookie parser for JWT & table session cookies
  app.use(cookieParser(process.env.COOKIE_SECRET || 'fallback-cookie-secret-min-32-chars'));

  // CORS configuration
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
  app.enableCors({
    origin: [frontendUrl, 'http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // API prefix
  app.setGlobalPrefix('api');

  // OpenAPI / Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Restaurant Ordering & Payment API (Colombia)')
    .setDescription(
      'API REST modular para pedidos mobile-first, división de cuentas, Wompi y Facturación DIAN.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth('staff_token')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || process.env.API_PORT || 4000;
  await app.listen(port);
  logger.log(`🚀 API corriendo exitosamente en el puerto ${port}`);
  logger.log(`📖 Documentación Swagger disponible en /api/docs`);
}

bootstrap();
