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

  // CORS: site production + local + FRONTEND_URL (Railway peut n'avoir qu'une URL)
  const productionOrigin = 'https://wifi.clubgei-polytech.org';
  const defaultOrigins = [productionOrigin, 'http://localhost:3000'];
  const fromEnv = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map(url => url.trim()).filter(Boolean)
    : [];
  const rawOrigins = [
    ...new Set([...defaultOrigins, ...fromEnv.map(url => url.replace(/\/$/, ''))]),
  ];
  const allowedOrigins = rawOrigins.map(url => url.replace(/\/$/, ''));
  
  logger.log('🌐 CORS Configuration:');
  logger.log(`   Allowed origins: ${allowedOrigins.join(', ')}`);
  logger.log(`   Total origins: ${allowedOrigins.length}`);
  
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }
      const originNormalized = origin.replace(/\/$/, '');
      const isInList =
        allowedOrigins.includes(originNormalized) ||
        allowedOrigins.some(allowed => originNormalized === allowed || originNormalized.startsWith(allowed + '/'));
      const isRailwayOrigin =
        configService.get('NODE_ENV') === 'production' &&
        (originNormalized.includes('.railway.app') || originNormalized.includes('.up.railway.app'));
      const isAllowed = isInList || isRailwayOrigin;

      if (isAllowed) {
        callback(null, true);
      } else {
        logger.warn(`❌ CORS: Origin blocked - ${origin} (allowed: ${allowedOrigins.join(', ')})`);
        callback(null, false);
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
    .setDescription(
      [
        'API vente de tickets Wi‑Fi (import CSV Mikhmon) — UNIKIN.',
        '',
        '**Prix** : stockés sur `ticket_types` (durées 24h / 7j / 30j), pas sur chaque ligne `tickets`.',
        'Pour KELPAY, `amount` = `ticket.ticketType.price`.',
        '',
        'Documentation Markdown : voir `docs/API.md` dans le dépôt.',
      ].join('\n'),
    )
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
    .addTag('Payments', 'Paiements liés aux ventes de tickets')
    .addTag('Kelpay', 'Mobile Money KELPAY — POST /payments/initiate (polling serveur checktransaction)')
    .addTag('Dashboard', 'Statistiques vente de tickets')
    .addTag('Users', 'Gestion des utilisateurs système')
    .addTag('App', 'Endpoints publics')
    .addTag('Tickets', 'Vente et consultation des tickets (public + authentifié)')
    .addTag('Tickets (Admin)', 'Import CSV et gestion des tickets (admin)')
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      docExpansion: 'list',
    },
    customSiteTitle: 'Club Internet Access API',
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
    const databaseUrl = configService.get<string>('DATABASE_URL');
    if (databaseUrl) {
      logger.log('📊 Database: Connected via DATABASE_URL');
    }
  } else {
    // Logs développement (détaillés)
    logger.log(`🚀 Application is running on: http://localhost:${port}`);
    logger.log(`📚 Swagger API Documentation: http://localhost:${port}/api`);
    logger.log(`🌍 Environment: ${nodeEnv}`);
    logger.log(`🌐 CORS Allowed Origins: ${allowedOrigins.join(', ')}`);
    
    // Afficher les infos DB en développement
    const databaseUrl = configService.get<string>('DATABASE_URL');
    if (databaseUrl) {
      try {
        const parsedUrl = new URL(databaseUrl);
        const dbName = parsedUrl.pathname.replace(/^\//, '') || 'unknown';
        logger.log(`📊 Database: ${parsedUrl.hostname}:${parsedUrl.port || '5432'}/${dbName} (DATABASE_URL)`);
      } catch {
        logger.warn('⚠️ DATABASE_URL invalide (non parsable).');
      }
    }
  }
}

bootstrap();

