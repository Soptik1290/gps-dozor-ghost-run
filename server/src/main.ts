import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Set global prefix for API
  app.setGlobalPrefix('api-nest');

  // ─────────────────────────────────────────────
  // Global Pipes
  // ─────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // ─────────────────────────────────────────────
  // CORS (for local dev + Render deployment)
  // ─────────────────────────────────────────────
  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // ─────────────────────────────────────────────
  // Swagger (OpenAPI)
  // ─────────────────────────────────────────────
  const config = new DocumentBuilder()
    .setTitle('GPS Dozor: Ghost Run API')
    .setDescription(
      `## Enterprise Fleet Telemetry Backend

Provides authentication, fleet management, and trip replay data for the Ghost Run gamification engine.

### Test Credentials
| Role | Username | Password |
|------|---------|----------|
| Admin | \`api_gpsdozor\` | \`yakmwlARdn\` |
| Driver | \`pilot_petr\` | \`password123\` |
| Driver | \`pilot_jana\` | \`password123\` |

> **Note:** Use the \`/auth/login\` endpoint to obtain a JWT token, then click **Authorize** and paste the token.
      `,
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('vehicles', 'Fleet management')
    .addTag('trips', 'Trip history and Ghost Replay data')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
    customSiteTitle: 'GPS Dozor API Docs',
  });

  const port = process.env.PORT ?? 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`\n🚀 GPS Dozor Ghost Run API running on: http://0.0.0.0:${port}`);
  console.log(`📚 Swagger Docs: http://0.0.0.0:${port}/api-nest/docs\n`);
}
bootstrap();
