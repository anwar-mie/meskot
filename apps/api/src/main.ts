import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('market. E-Commerce API')
    .setDescription('Single-vendor Ethiopian e-commerce platform REST API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port);
  console.log(`API running on http://localhost:${port}/api/v1 (Swagger: /api/docs)`);
}

bootstrap();
