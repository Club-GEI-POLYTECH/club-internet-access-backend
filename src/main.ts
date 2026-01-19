import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Enable CORS for frontend
  const allowedOrigins = process.env.FRONTEND_URL 
    ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
    : ['http://localhost:3000'];
  
  app.enableCors({
    origin: (origin, callback) => {
      // Permettre les requêtes sans origine (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      // Vérifier si l'origine est autorisée
      if (allowedOrigins.some(allowed => origin.startsWith(allowed))) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
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

  const port = configService.get<number>('PORT') || 3000;
  const nodeEnv = configService.get<string>('NODE_ENV') || 'development';
  
  await app.listen(port);
  
  if (nodeEnv === 'production') {
    // Logs production (minimaux et sécurisés)
    const railwayPublicDomain = configService.get<string>('RAILWAY_PUBLIC_DOMAIN');
    const baseUrl = railwayPublicDomain 
      ? `https://${railwayPublicDomain}`
      : `http://localhost:${port}`;
    
    logger.log(`🚀 Application started on port ${port}`);
    if (railwayPublicDomain) {
      logger.log(`🌐 Public URL: ${baseUrl}`);
      logger.log(`📚 API Documentation: ${baseUrl}/api`);
    } else {
      logger.log(`📚 API Documentation: /api`);
    }
    logger.log(`🌍 Environment: ${nodeEnv}`);
    
    // Afficher les infos DB de manière sécurisée
    const pgHost = configService.get<string>('PGHOST');
    const dbHost = configService.get<string>('DB_HOST');
    if (pgHost) {
      logger.log(`📊 Database: Connected via PG* variables (Railway)`);
    } else if (dbHost) {
      logger.log(`📊 Database: Connected via DB_* variables`);
    }
  } else {
    // Logs développement (détaillés)
    logger.log(`🚀 Application is running on: http://localhost:${port}`);
    logger.log(`📚 API Documentation: http://localhost:${port}/api`);
    logger.log(`🌍 Environment: ${nodeEnv}`);
    
    // Afficher les infos DB en développement
    const pgHost = configService.get<string>('PGHOST');
    const pgPort = configService.get<number>('PGPORT');
    const pgDatabase = configService.get<string>('PGDATABASE');
    const dbHost = configService.get<string>('DB_HOST');
    const dbPort = configService.get<number>('DB_PORT');
    const dbName = configService.get<string>('DB_DATABASE') || configService.get<string>('DB_NAME');
    
    if (pgHost) {
      logger.log(`📊 Database: ${pgHost}:${pgPort || 5432}/${pgDatabase} (PG* variables)`);
    } else if (dbHost) {
      logger.log(`📊 Database: ${dbHost}:${dbPort || 5432}/${dbName || 'internet_access'} (DB_* variables)`);
    }
  }
}

bootstrap();

