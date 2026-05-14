import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';
import { entities } from './src/config/entities.config';

dotenv.config({ path: '.env' });

const databaseUrl = (process.env.DATABASE_URL ?? '').trim();
if (!databaseUrl) {
  throw new Error('DATABASE_URL manquant : chargez un fichier .env à la racine du projet.');
}

let hostname = 'unknown';
try {
  hostname = new URL(databaseUrl).hostname;
} catch {
  /* ignore */
}

const isCloudHost =
  hostname.includes('railway.app') ||
  hostname.includes('render.com') ||
  hostname.includes('neon.tech') ||
  hostname.includes('supabase.co');

export default new DataSource({
  type: 'postgres',
  url: databaseUrl,
  entities,
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  migrationsTableName: 'migrations',
  ssl: isCloudHost ? { rejectUnauthorized: false } : false,
});
