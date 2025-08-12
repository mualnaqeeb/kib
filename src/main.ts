import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Get config service
  const configService = app.get(ConfigService);
  const port = configService.get<number>('port', 8080);

  // Enable CORS
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger documentation setup
  const config = new DocumentBuilder()
    .setTitle('KIB Movie Database API')
    .setDescription(
      `A comprehensive REST API for managing movies, ratings, and watchlists. 
      This API integrates with TMDB (The Movie Database) to provide rich movie data 
      while allowing users to rate movies and manage their personal watchlists.`,
    )
    .setVersion('1.0')
    .addTag('Movies', 'Endpoints for movie operations')
    .addTag('Users', 'User management and authentication')
    .addTag('Ratings', 'Movie rating operations')
    .addBearerAuth()
    .addServer(`http://localhost:${port}`, 'Local Development')
    .addServer('http://localhost:8080', 'Docker Environment')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  // Start the application
  await app.listen(port);

  console.log(`
  🚀 Application is running on: http://localhost:${port}
  📚 API Documentation available at: http://localhost:${port}/api
  🎬 KIB Movie Database API v1.0
  `);
}

void bootstrap();
