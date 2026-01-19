import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { entities } from './entities.config';

export const databaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => {
  const logger = new Logger('DatabaseConfig');
  const isDevelopment = configService.get<string>('NODE_ENV') === 'development';
  const isProduction = configService.get<string>('NODE_ENV') === 'production';
  
  // Priorité 1 : Variables PG* (Railway - nomenclature standard)
  const pgHost = configService.get<string>('PGHOST');
  const pgPort = configService.get<number>('PGPORT');
  const pgUser = configService.get<string>('PGUSER');
  const pgPassword = configService.get<string>('PGPASSWORD');
  const pgDatabase = configService.get<string>('PGDATABASE');
  
  if (pgHost && pgUser && pgPassword && pgDatabase) {
    logger.log(`✅ Using PG* variables (Railway nomenclature)`);
    logger.log(`   Host: ${pgHost}`);
    logger.log(`   Port: ${pgPort || 5432}`);
    logger.log(`   Database: ${pgDatabase}`);
    logger.log(`   User: ${pgUser}`);
    logger.log(`   NODE_ENV: ${configService.get<string>('NODE_ENV')}, isProduction: ${isProduction}`);
    
    // Railway nécessite SSL en production
    const sslConfig = isProduction || pgHost.includes('railway.app') || pgHost.includes('render.com')
      ? { rejectUnauthorized: false }
      : false;
    
    logger.log(`   SSL enabled: ${!!sslConfig}`);
    
    return {
      type: 'postgres',
      host: pgHost,
      port: pgPort || 5432,
      username: pgUser,
      password: pgPassword,
      database: pgDatabase,
      // Utiliser les imports directs des entités (meilleure approche)
      // Les imports fonctionnent car les fichiers sont compilés dans dist/
      entities: entities,
      migrations: isProduction 
        ? [__dirname + '/../../migrations/*.js']
        : [__dirname + '/../../migrations/*{.ts,.js}'],
      migrationsRun: false,
      migrationsTableName: 'migrations',
      synchronize: false, // ⚠️ TEMPORAIRE: Activer pour la première production. DÉSACTIVER APRÈS LA PREMIÈRE SYNCHRONISATION !
      logging: isDevelopment,
      ssl: sslConfig,
      // Options de connexion pour Railway
      extra: {
        // Timeout de connexion (10 secondes)
        connectionTimeoutMillis: 10000,
        // Pool de connexions
        max: 10,
        // Retry logic
        idleTimeoutMillis: 30000,
      },
      // Retry configuration
      retryAttempts: 5,
      retryDelay: 3000,
    };
  }
  
  // Priorité 2 : Variables DB_* (local, Docker - fallback)
  logger.warn('⚠️  PG* variables not found, falling back to DB_* variables (local/Docker)');
  logger.log(`   Host: ${configService.get<string>('DB_HOST') || 'postgres'}`);
  logger.log(`   Port: ${configService.get<number>('DB_PORT') || 5432}`);
  logger.log(`   Database: ${configService.get<string>('DB_DATABASE') || configService.get<string>('DB_NAME') || 'internet_access'}`);
  
  return {
    type: 'postgres',
    host: configService.get<string>('DB_HOST') || 'postgres',
    port: configService.get<number>('DB_PORT') || 5432,
    username: configService.get<string>('DB_USERNAME') || configService.get<string>('DB_USER') || 'unikin_user',
    password: configService.get<string>('DB_PASSWORD') || 'unikin_password',
    database: configService.get<string>('DB_DATABASE') || configService.get<string>('DB_NAME') || 'internet_access',
    // Utiliser les imports directs des entités (meilleure approche)
    entities: entities,
    migrations: [__dirname + '/../../migrations/*{.ts,.js}'],
    migrationsRun: false,
    migrationsTableName: 'migrations',
    synchronize: isDevelopment,
    logging: isDevelopment,
    ssl: false, // Pas de SSL en local
  };
};
