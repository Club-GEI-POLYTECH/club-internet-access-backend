import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Enable CORS: production (wifi.clubgei-polytech.org) + local (localhost:3000)
  const defaultOrigins = [
    'https://wifi.clubgei-polytech.org',
    'http://localhost:3000',
  ];
  const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map(url => url.trim()).filter(Boolean)
    : defaultOrigins;
  
  // Logger les origines CORS autorisées
  logger.log('🌐 CORS Configuration:');
  logger.log(`   Allowed origins: ${allowedOrigins.join(', ')}`);
  logger.log(`   Total origins: ${allowedOrigins.length}`);
  
  app.enableCors({
    origin: (origin, callback) => {
      // Permettre les requêtes sans origine (mobile apps, Postman, etc.)
      if (!origin) {
        logger.debug('✅ CORS: Request without origin allowed (mobile app, Postman, etc.)');
        return callback(null, true);
      }
      
      // Vérifier si l'origine est autorisée
      const isAllowed = allowedOrigins.some(allowed => origin.startsWith(allowed));
      
      if (isAllowed) {
        logger.debug(`✅ CORS: Origin allowed - ${origin}`);
        callback(null, true);
      } else {
        logger.warn(`❌ CORS: Origin blocked - ${origin}`);
        logger.warn(`   Allowed origins: ${allowedOrigins.join(', ')}`);
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

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('Club Internet Access API')
    .setDescription('API REST pour la gestion d\'accès Wi-Fi via MikroTik RouterOS - Club Internet Access UNIKIN')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Entrez le token JWT',
        in: 'header',
      },
      'JWT-auth', // This name here is important for matching up with @ApiBearerAuth() in your controller!
    )
    .addTag('Auth', 'Endpoints d\'authentification')
    .addTag('WiFi Accounts', 'Gestion des comptes Wi-Fi')
    .addTag('Payments', 'Gestion des paiements')
    .addTag('Sessions', 'Gestion des sessions actives')
    .addTag('Dashboard', 'Statistiques et dashboard')
    .addTag('MikroTik', 'Contrôle RouterOS MikroTik')
    .addTag('Users', 'Gestion des utilisateurs système')
    .addTag('Bandwidth', 'Statistiques de bande passante')
    .addTag('App', 'Endpoints publics')
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

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
      logger.log(`📚 Swagger API Documentation: ${baseUrl}/api`);
    } else {
      logger.log(`📚 Swagger API Documentation: /api`);
    }
    logger.log(`🌍 Environment: ${nodeEnv}`);
    logger.log(`🌐 CORS Allowed Origins: ${allowedOrigins.join(', ')}`);
    
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
    logger.log(`📚 Swagger API Documentation: http://localhost:${port}/api`);
    logger.log(`🌍 Environment: ${nodeEnv}`);
    logger.log(`🌐 CORS Allowed Origins: ${allowedOrigins.join(', ')}`);
    
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

