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

  const databaseUrl = (configService.get<string>('DATABASE_URL') ?? '').trim();
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  let hostname = 'unknown';
  try {
    hostname = new URL(databaseUrl).hostname;
  } catch {
    logger.warn('⚠️ DATABASE_URL invalide, impossible de parser le host.');
  }

  logger.log('✅ Using DATABASE_URL for PostgreSQL connection');
  logger.log(`   Host: ${hostname}`);
  logger.log(`   NODE_ENV: ${configService.get<string>('NODE_ENV')}, isProduction: ${isProduction}`);

  const isCloudHost =
    hostname.includes('railway.app') ||
    hostname.includes('render.com') ||
    hostname.includes('neon.tech') ||
    hostname.includes('supabase.co');
  const sslConfig = isCloudHost ? { rejectUnauthorized: false } : false;

  return {
    type: 'postgres',
    url: databaseUrl,
    entities,
    migrations: isProduction
      ? [__dirname + '/../../migrations/*.js']
      : [__dirname + '/../../migrations/*{.ts,.js}'],
    migrationsRun: false,
    migrationsTableName: 'migrations',
    synchronize: true, // ⚠️ TEMPORAIRE: Activer pour la première production. DÉSACTIVER APRÈS LA PREMIÈRE SYNCHRONISATION !
    logging: isDevelopment,
    ssl: sslConfig,
    extra: {
      connectionTimeoutMillis: 10000,
      max: 10,
      idleTimeoutMillis: 30000,
    },
    retryAttempts: 5,
    retryDelay: 3000,
  };
};
